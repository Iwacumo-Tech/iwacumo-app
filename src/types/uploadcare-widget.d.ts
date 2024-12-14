declare module "uploadcare-widget" {
  interface UploadcareFile {
    promise: () => Promise<{ cdnUrl: string; [key: string]: unknown }>;
  }

  interface Uploadcare {
    openDialog: (
      file?: null,
      options?: { publicKey: string }
    ) => {
      done: (callback: (file: UploadcareFile) => void) => void;
    };
  }

  const uploadcare: Uploadcare;

  export default uploadcare;
}
