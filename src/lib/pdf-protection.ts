import { createHmac } from "node:crypto";
import { createCipheriv, randomBytes } from "node:crypto";
import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFNumber,
  PDFRawStream,
  PDFString,
} from "pdf-lib";
import {
  RC4,
  bytesToHex,
  hexToBytes,
  md5,
} from "@pdfsmaller/pdf-encrypt-lite";

const PADDING = new Uint8Array([
  0x28, 0xbf, 0x4e, 0x5e, 0x4e, 0x75, 0x8a, 0x41,
  0x64, 0x00, 0x4e, 0x56, 0xff, 0xfa, 0x01, 0x08,
  0x2e, 0x2e, 0x00, 0xb6, 0xd0, 0x68, 0x3e, 0x80,
  0x2f, 0x0c, 0xa9, 0xfe, 0x64, 0x53, 0x69, 0x7a,
]);

const OWNER_PASSWORD_SECRET =
  process.env.PDF_OWNER_PASSWORD_SECRET ||
  process.env.AUTH_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "iwacumo-secure-pdf-owner-fallback";

type SecurePdfContext = {
  bookId: string;
  userEmail: string;
  sourceUrl?: string | null;
};

function padPassword(password: string) {
  const pwdBytes = new TextEncoder().encode(password);
  const padded = new Uint8Array(32);

  if (pwdBytes.length >= 32) {
    padded.set(pwdBytes.slice(0, 32));
  } else {
    padded.set(pwdBytes);
    padded.set(PADDING.slice(0, 32 - pwdBytes.length), pwdBytes.length);
  }

  return padded;
}

function computeOwnerKey(ownerPassword: string, userPassword: string) {
  const paddedOwner = padPassword(ownerPassword || userPassword);
  let hash = md5(paddedOwner);

  for (let i = 0; i < 50; i++) {
    hash = md5(hash);
  }

  const paddedUser = padPassword(userPassword);
  let result = new Uint8Array(paddedUser);

  for (let i = 0; i < 20; i++) {
    const key = new Uint8Array(hash.length);
    for (let j = 0; j < hash.length; j++) {
      key[j] = hash[j] ^ i;
    }
    const rc4 = new RC4(key.slice(0, 16));
    result = new Uint8Array(rc4.process(result));
  }

  return result;
}

function computeEncryptionKey(
  userPassword: string,
  ownerKey: Uint8Array,
  permissions: number,
  fileId: Uint8Array
) {
  const paddedPwd = padPassword(userPassword);
  const hashInput = new Uint8Array(
    paddedPwd.length + ownerKey.length + 4 + fileId.length
  );

  let offset = 0;
  hashInput.set(paddedPwd, offset);
  offset += paddedPwd.length;
  hashInput.set(ownerKey, offset);
  offset += ownerKey.length;

  hashInput[offset++] = permissions & 0xff;
  hashInput[offset++] = (permissions >> 8) & 0xff;
  hashInput[offset++] = (permissions >> 16) & 0xff;
  hashInput[offset++] = (permissions >> 24) & 0xff;

  hashInput.set(fileId, offset);

  let hash = md5(hashInput);
  for (let i = 0; i < 50; i++) {
    hash = md5(hash.slice(0, 16));
  }

  return new Uint8Array(hash.slice(0, 16));
}

function computeUserKey(encryptionKey: Uint8Array, fileId: Uint8Array) {
  const hashInput = new Uint8Array(PADDING.length + fileId.length);
  hashInput.set(PADDING);
  hashInput.set(fileId, PADDING.length);

  const hash = md5(hashInput);
  const rc4 = new RC4(encryptionKey);
  let result = new Uint8Array(rc4.process(hash));

  for (let i = 1; i <= 19; i++) {
    const key = new Uint8Array(encryptionKey.length);
    for (let j = 0; j < encryptionKey.length; j++) {
      key[j] = encryptionKey[j] ^ i;
    }
    const rc4iter = new RC4(key);
    result = new Uint8Array(rc4iter.process(result));
  }

  const finalResult = new Uint8Array(32);
  finalResult.set(result);
  finalResult.set(new Uint8Array(16), 16);

  return finalResult;
}

function encryptObject(
  data: Uint8Array,
  objectNum: number,
  generationNum: number,
  encryptionKey: Uint8Array
) {
  const keyInput = new Uint8Array(encryptionKey.length + 5);
  keyInput.set(encryptionKey);
  keyInput[encryptionKey.length] = objectNum & 0xff;
  keyInput[encryptionKey.length + 1] = (objectNum >> 8) & 0xff;
  keyInput[encryptionKey.length + 2] = (objectNum >> 16) & 0xff;
  keyInput[encryptionKey.length + 3] = generationNum & 0xff;
  keyInput[encryptionKey.length + 4] = (generationNum >> 8) & 0xff;

  const objectKey = md5(keyInput).slice(0, 16);
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-128-cbc", Buffer.from(objectKey), iv);
  const ciphertext = Buffer.concat([
    cipher.update(Buffer.from(data)),
    cipher.final(),
  ]);
  return new Uint8Array(Buffer.concat([iv, ciphertext]));
}

function encryptStringsInObject(
  obj: unknown,
  objectNum: number,
  generationNum: number,
  encryptionKey: Uint8Array
) {
  if (!obj) return;

  if (obj instanceof PDFString) {
    const encrypted = encryptObject(
      obj.asBytes(),
      objectNum,
      generationNum,
      encryptionKey
    );
    const mutableString = obj as unknown as { value: string };
    mutableString.value = Array.from(encrypted)
      .map((b) => String.fromCharCode(b))
      .join("");
    return;
  }

  if (obj instanceof PDFHexString) {
    const encrypted = encryptObject(
      obj.asBytes(),
      objectNum,
      generationNum,
      encryptionKey
    );
    const mutableHexString = obj as unknown as { value: string };
    mutableHexString.value = bytesToHex(encrypted);
    return;
  }

  if (obj instanceof PDFDict) {
    for (const [key, value] of obj.entries()) {
      const keyName = key.asString();
      if (
        keyName !== "/Length" &&
        keyName !== "/Filter" &&
        keyName !== "/DecodeParms"
      ) {
        encryptStringsInObject(value, objectNum, generationNum, encryptionKey);
      }
    }
    return;
  }

  if (obj instanceof PDFArray) {
    for (const element of obj.asArray()) {
      encryptStringsInObject(element, objectNum, generationNum, encryptionKey);
    }
  }
}

function getRestrictedPermissionsValue() {
  let permissions = 0xfffffffc;

  for (const bitPosition of [3, 4, 5, 6, 9, 11, 12]) {
    permissions &= ~(1 << (bitPosition - 1));
  }

  return permissions | 0;
}

function deriveOwnerPassword(context: SecurePdfContext) {
  return createHmac("sha256", OWNER_PASSWORD_SECRET)
    .update(
      [
        context.bookId,
        context.userEmail.toLowerCase(),
        context.sourceUrl ?? "",
      ].join("|")
    )
    .digest("hex");
}

function resolveFileId(pdfDoc: PDFDocument) {
  const trailer = pdfDoc.context.trailerInfo;
  const idArray = trailer.ID;

  if (idArray && Array.isArray(idArray) && idArray.length > 0) {
    const idString = idArray[0].toString();
    return hexToBytes(idString.replace(/^<|>$/g, ""));
  }

  const randomBytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(randomBytes);
  return randomBytes;
}

export async function applyRestrictedPdfProtection(
  pdfBytes: Uint8Array,
  context: SecurePdfContext
) {
  const pdfDoc = await PDFDocument.load(pdfBytes, {
    ignoreEncryption: true,
    updateMetadata: false,
  });

  const permissions = getRestrictedPermissionsValue();
  const userPassword = "";
  const ownerPassword = deriveOwnerPassword(context);
  const fileId = resolveFileId(pdfDoc);
  const ownerKey = computeOwnerKey(ownerPassword, userPassword);
  const encryptionKey = computeEncryptionKey(
    userPassword,
    ownerKey,
    permissions,
    fileId
  );
  const userKey = computeUserKey(encryptionKey, fileId);
  const contextRef = pdfDoc.context;

  for (const [ref, obj] of contextRef.enumerateIndirectObjects()) {
    const objectNum = ref.objectNumber;
    const generationNum = ref.generationNumber || 0;

    if (obj instanceof PDFDict) {
      const filter = obj.get(PDFName.of("Filter"));
      if (filter instanceof PDFName && filter.asString() === "/Standard") {
        continue;
      }
    }

    if (obj instanceof PDFRawStream && obj.dict) {
      const type = obj.dict.get(PDFName.of("Type"));
      if (type) {
        const typeName = type.toString();
        if (
          typeName === "/XRef" ||
          typeName === "/Metadata" ||
          typeName === "/Sig" ||
          typeName === "/DocTimeStamp"
        ) {
          continue;
        }
      }
    }

    if (obj instanceof PDFRawStream) {
      const mutableStream = obj as unknown as { contents: Uint8Array };
      mutableStream.contents = encryptObject(
        obj.contents,
        objectNum,
        generationNum,
        encryptionKey
      );
      if (obj.dict) {
        encryptStringsInObject(
          obj.dict,
          objectNum,
          generationNum,
          encryptionKey
        );
      }
    } else {
      encryptStringsInObject(obj, objectNum, generationNum, encryptionKey);
    }
  }

  const encryptDict = contextRef.obj({
    Filter: PDFName.of("Standard"),
    V: PDFNumber.of(4),
    R: PDFNumber.of(4),
    Length: PDFNumber.of(128),
    P: PDFNumber.of(permissions),
    O: PDFHexString.of(bytesToHex(ownerKey)),
    U: PDFHexString.of(bytesToHex(userKey)),
    StmF: PDFName.of("StdCF"),
    StrF: PDFName.of("StdCF"),
    CF: contextRef.obj({
      StdCF: contextRef.obj({
        CFM: PDFName.of("AESV2"),
        AuthEvent: PDFName.of("DocOpen"),
        Length: PDFNumber.of(16),
      }),
    }),
  });

  const encryptRef = contextRef.register(encryptDict);
  contextRef.trailerInfo.Encrypt = encryptRef;

  return pdfDoc.save({
    useObjectStreams: false,
  });
}
