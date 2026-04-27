import axios from "axios";

export const PAYMENT_GATEWAYS = {
  PAYSTACK: "paystack",
  STRIPE: "stripe",
  PAYPAL: "paypal",
  FLUTTERWAVE: "flutterwave",
} as const;

export const PAYMENT_METHODS = {
  CARD: "card",
  BANK_TRANSFER: "bank_transfer",
  PAYPAL: "paypal",
  MOBILE_MONEY: "mobile_money",
} as const;

export type PaymentGateway = (typeof PAYMENT_GATEWAYS)[keyof typeof PAYMENT_GATEWAYS];
export type PaymentMethod = (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS];
export type PaymentGatewayMode = "test" | "live";
export type GatewayHealthStatus = "configured" | "missing_credentials" | "disabled";

export type CurrencyRateConfig = {
  rate: number;
  updated_at: string | null;
  minor_unit?: number | null;
};

export type CurrencySettings = {
  base_currency: string;
  supported_checkout_currencies: string[];
  default_checkout_currency: string;
  conversion_rates: Record<string, CurrencyRateConfig>;
};

export type PaymentGatewaySetting = {
  enabled: boolean;
  sort_order: number;
  supported_currencies: string[];
  supported_methods: PaymentMethod[];
  display_name?: string;
  mode?: PaymentGatewayMode;
};

export type PaymentGatewaySettings = Record<PaymentGateway, PaymentGatewaySetting>;

export type PaymentGatewayHealth = {
  gateway: PaymentGateway;
  display_name: string;
  status: GatewayHealthStatus;
  configured: boolean;
  checkout_ready: boolean;
  implemented: boolean;
  missing_credentials: string[];
};

export type PaymentRouteOption = {
  gateway: PaymentGateway;
  method: PaymentMethod;
  gateway_label: string;
  method_label: string;
};

export type CreatePaymentSessionInput = {
  orderId: string;
  orderNumber: string;
  email: string;
  amount: number;
  currency: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
};

export type CreatePaymentSessionResult = {
  authorization_url: string | null;
  access_code: string | null;
  reference: string;
  provider: PaymentGateway;
  processor_response?: unknown;
};

export type VerifyGatewayPaymentResult = {
  success: boolean;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  processor_response: unknown;
};

export type NormalizedWebhookEvent = {
  type: "charge.success" | "charge.failed" | "unknown";
  orderId: string | null;
  reference: string | null;
  amount: number;
  currency: string;
  processor_response: unknown;
};

export interface PaymentGatewayAdapter {
  gateway: PaymentGateway;
  displayName: string;
  implemented: boolean;
  supportsCurrency: (currency: string, settings: PaymentGatewaySetting) => boolean;
  supportsMethod: (method: PaymentMethod, settings: PaymentGatewaySetting) => boolean;
  getCredentialHealth: () => { configured: boolean; missing_credentials: string[] };
  createPaymentSession: (input: CreatePaymentSessionInput) => Promise<CreatePaymentSessionResult>;
  verifyPayment: (reference: string) => Promise<VerifyGatewayPaymentResult>;
  normalizeWebhookEvent: (request: Request) => Promise<NormalizedWebhookEvent>;
}

const COMMON_CURRENCIES = ["NGN", "USD", "GBP", "EUR"] as const;

export const DEFAULT_CURRENCY_SETTINGS: CurrencySettings = {
  base_currency: "NGN",
  supported_checkout_currencies: ["NGN"],
  default_checkout_currency: "NGN",
  conversion_rates: {
    NGN: { rate: 1, updated_at: null, minor_unit: 0 },
    USD: { rate: 0, updated_at: null, minor_unit: 2 },
    GBP: { rate: 0, updated_at: null, minor_unit: 2 },
    EUR: { rate: 0, updated_at: null, minor_unit: 2 },
  },
};

export const DEFAULT_PAYMENT_GATEWAY_SETTINGS: PaymentGatewaySettings = {
  paystack: {
    enabled: true,
    sort_order: 1,
    supported_currencies: ["NGN"],
    supported_methods: [PAYMENT_METHODS.CARD, PAYMENT_METHODS.BANK_TRANSFER],
    display_name: "Paystack",
    mode: "live",
  },
  stripe: {
    enabled: false,
    sort_order: 2,
    supported_currencies: ["USD", "GBP", "EUR"],
    supported_methods: [PAYMENT_METHODS.CARD],
    display_name: "Stripe",
    mode: "test",
  },
  paypal: {
    enabled: false,
    sort_order: 3,
    supported_currencies: ["USD", "GBP", "EUR"],
    supported_methods: [PAYMENT_METHODS.PAYPAL],
    display_name: "PayPal",
    mode: "test",
  },
  flutterwave: {
    enabled: false,
    sort_order: 4,
    supported_currencies: ["NGN", "USD", "GBP", "EUR"],
    supported_methods: [PAYMENT_METHODS.CARD, PAYMENT_METHODS.BANK_TRANSFER, PAYMENT_METHODS.MOBILE_MONEY],
    display_name: "Flutterwave",
    mode: "test",
  },
};

function normalizeCurrencyCode(code: string | null | undefined) {
  return (code || "").trim().toUpperCase();
}

function toPositiveNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : fallback;
}

function toNonNegativeInteger(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.round(value)
    : fallback;
}

function ensureCurrencyRates(raw: unknown) {
  const source = raw && typeof raw === "object"
    ? raw as Record<string, CurrencyRateConfig>
    : {};

  const normalized: Record<string, CurrencyRateConfig> = {};

  for (const code of COMMON_CURRENCIES) {
    const sourceEntry = source[code];
    normalized[code] = {
      rate: code === "NGN" ? 1 : toPositiveNumber(sourceEntry?.rate, DEFAULT_CURRENCY_SETTINGS.conversion_rates[code].rate),
      updated_at: typeof sourceEntry?.updated_at === "string" ? sourceEntry.updated_at : null,
      minor_unit: toNonNegativeInteger(
        sourceEntry?.minor_unit,
        DEFAULT_CURRENCY_SETTINGS.conversion_rates[code].minor_unit ?? 2
      ),
    };
  }

  return normalized;
}

export function normalizeCurrencySettings(raw: unknown): CurrencySettings {
  const source = raw && typeof raw === "object" ? raw as Partial<CurrencySettings> : {};
  const baseCurrency = normalizeCurrencyCode(source.base_currency) || DEFAULT_CURRENCY_SETTINGS.base_currency;
  const supported = Array.isArray(source.supported_checkout_currencies)
    ? source.supported_checkout_currencies
      .map(normalizeCurrencyCode)
      .filter(Boolean)
    : DEFAULT_CURRENCY_SETTINGS.supported_checkout_currencies;

  const dedupedSupported = Array.from(new Set([
    baseCurrency,
    ...supported,
  ]));

  const rates = ensureCurrencyRates(source.conversion_rates);
  rates[baseCurrency] = {
    rate: 1,
    updated_at: rates[baseCurrency]?.updated_at ?? null,
    minor_unit: rates[baseCurrency]?.minor_unit ?? (baseCurrency === "NGN" ? 0 : 2),
  };

  const defaultCurrencyCandidate = normalizeCurrencyCode(source.default_checkout_currency);
  const defaultCheckoutCurrency = dedupedSupported.includes(defaultCurrencyCandidate)
    ? defaultCurrencyCandidate
    : (dedupedSupported.includes(DEFAULT_CURRENCY_SETTINGS.default_checkout_currency)
      ? DEFAULT_CURRENCY_SETTINGS.default_checkout_currency
      : dedupedSupported[0]);

  return {
    base_currency: baseCurrency,
    supported_checkout_currencies: dedupedSupported,
    default_checkout_currency: defaultCheckoutCurrency,
    conversion_rates: rates,
  };
}

export function normalizePaymentGatewaySettings(raw: unknown): PaymentGatewaySettings {
  const source = raw && typeof raw === "object" ? raw as Partial<PaymentGatewaySettings> : {};

  return {
    paystack: {
      ...DEFAULT_PAYMENT_GATEWAY_SETTINGS.paystack,
      ...(source.paystack ?? {}),
      supported_currencies: Array.isArray(source.paystack?.supported_currencies)
        ? source.paystack.supported_currencies.map(normalizeCurrencyCode).filter(Boolean)
        : DEFAULT_PAYMENT_GATEWAY_SETTINGS.paystack.supported_currencies,
      supported_methods: Array.isArray(source.paystack?.supported_methods)
        ? source.paystack.supported_methods.filter(Boolean) as PaymentMethod[]
        : DEFAULT_PAYMENT_GATEWAY_SETTINGS.paystack.supported_methods,
    },
    stripe: {
      ...DEFAULT_PAYMENT_GATEWAY_SETTINGS.stripe,
      ...(source.stripe ?? {}),
      supported_currencies: Array.isArray(source.stripe?.supported_currencies)
        ? source.stripe.supported_currencies.map(normalizeCurrencyCode).filter(Boolean)
        : DEFAULT_PAYMENT_GATEWAY_SETTINGS.stripe.supported_currencies,
      supported_methods: Array.isArray(source.stripe?.supported_methods)
        ? source.stripe.supported_methods.filter(Boolean) as PaymentMethod[]
        : DEFAULT_PAYMENT_GATEWAY_SETTINGS.stripe.supported_methods,
    },
    paypal: {
      ...DEFAULT_PAYMENT_GATEWAY_SETTINGS.paypal,
      ...(source.paypal ?? {}),
      supported_currencies: Array.isArray(source.paypal?.supported_currencies)
        ? source.paypal.supported_currencies.map(normalizeCurrencyCode).filter(Boolean)
        : DEFAULT_PAYMENT_GATEWAY_SETTINGS.paypal.supported_currencies,
      supported_methods: Array.isArray(source.paypal?.supported_methods)
        ? source.paypal.supported_methods.filter(Boolean) as PaymentMethod[]
        : DEFAULT_PAYMENT_GATEWAY_SETTINGS.paypal.supported_methods,
    },
    flutterwave: {
      ...DEFAULT_PAYMENT_GATEWAY_SETTINGS.flutterwave,
      ...(source.flutterwave ?? {}),
      supported_currencies: Array.isArray(source.flutterwave?.supported_currencies)
        ? source.flutterwave.supported_currencies.map(normalizeCurrencyCode).filter(Boolean)
        : DEFAULT_PAYMENT_GATEWAY_SETTINGS.flutterwave.supported_currencies,
      supported_methods: Array.isArray(source.flutterwave?.supported_methods)
        ? source.flutterwave.supported_methods.filter(Boolean) as PaymentMethod[]
        : DEFAULT_PAYMENT_GATEWAY_SETTINGS.flutterwave.supported_methods,
    },
  };
}

export function getCurrencyRate(currency: string, settings: CurrencySettings) {
  const normalizedCurrency = normalizeCurrencyCode(currency);
  const normalizedBase = normalizeCurrencyCode(settings.base_currency);

  if (!normalizedCurrency || normalizedCurrency === normalizedBase) {
    return 1;
  }

  return settings.conversion_rates[normalizedCurrency]?.rate ?? 0;
}

export function getCurrencyMinorUnit(currency: string, settings: CurrencySettings) {
  const normalizedCurrency = normalizeCurrencyCode(currency);
  return settings.conversion_rates[normalizedCurrency]?.minor_unit
    ?? (normalizedCurrency === "NGN" ? 0 : 2);
}

export function roundCurrencyAmount(amount: number, currency: string, settings: CurrencySettings) {
  const minorUnit = getCurrencyMinorUnit(currency, settings);
  const factor = Math.pow(10, minorUnit);
  return Math.round(amount * factor) / factor;
}

export function convertBaseAmount(amount: number, targetCurrency: string, settings: CurrencySettings) {
  const normalizedTarget = normalizeCurrencyCode(targetCurrency);
  const normalizedBase = normalizeCurrencyCode(settings.base_currency);

  if (!normalizedTarget || normalizedTarget === normalizedBase) {
    return roundCurrencyAmount(amount, normalizedBase, settings);
  }

  const rate = getCurrencyRate(normalizedTarget, settings);
  if (!rate || rate <= 0) {
    return 0;
  }

  return roundCurrencyAmount(amount * rate, normalizedTarget, settings);
}

export function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: normalizeCurrencyCode(currency) || "NGN",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${normalizeCurrencyCode(currency) || "NGN"} ${amount.toFixed(2)}`;
  }
}

export function getGatewayDisplayName(gateway: PaymentGateway, settings?: PaymentGatewaySettings) {
  return settings?.[gateway]?.display_name
    || DEFAULT_PAYMENT_GATEWAY_SETTINGS[gateway].display_name
    || gateway;
}

export function getPaymentMethodLabel(method: PaymentMethod) {
  switch (method) {
    case PAYMENT_METHODS.CARD:
      return "Card";
    case PAYMENT_METHODS.BANK_TRANSFER:
      return "Bank Transfer";
    case PAYMENT_METHODS.PAYPAL:
      return "PayPal";
    case PAYMENT_METHODS.MOBILE_MONEY:
      return "Mobile Money";
    default:
      return method;
  }
}

function buildCredentialHealth(required: Array<[string, string | undefined]>) {
  const missing_credentials = required
    .filter(([, value]) => !value)
    .map(([key]) => key);

  return {
    configured: missing_credentials.length === 0,
    missing_credentials,
  };
}

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";
const PAYSTACK_BASE_URL = "https://api.paystack.co";

const paystackAdapter: PaymentGatewayAdapter = {
  gateway: PAYMENT_GATEWAYS.PAYSTACK,
  displayName: "Paystack",
  implemented: true,
  supportsCurrency: (currency, settings) =>
    settings.supported_currencies.includes(normalizeCurrencyCode(currency)),
  supportsMethod: (method, settings) =>
    settings.supported_methods.includes(method),
  getCredentialHealth: () => buildCredentialHealth([
    ["PAYSTACK_SECRET_KEY", PAYSTACK_SECRET_KEY],
  ]),
  createPaymentSession: async (input) => {
    const amountInMinorUnit = Math.round(input.amount * 100);
    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      {
        email: input.email,
        amount: amountInMinorUnit,
        currency: normalizeCurrencyCode(input.currency) || "NGN",
        reference: `order_${input.orderNumber}_${Date.now()}`,
        callback_url: input.callbackUrl,
        metadata: {
          order_id: input.orderId,
          order_number: input.orderNumber,
          ...(input.metadata ?? {}),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const { data } = response.data;
    return {
      authorization_url: data.authorization_url,
      access_code: data.access_code ?? null,
      reference: data.reference,
      provider: PAYMENT_GATEWAYS.PAYSTACK,
      processor_response: response.data,
    };
  },
  verifyPayment: async (reference) => {
    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
      {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
      }
    );

    const { data } = response.data;
    return {
      success: data.status === "success",
      reference: data.reference,
      amount: (data.amount ?? 0) / 100,
      currency: data.currency || "NGN",
      status: data.status,
      processor_response: response.data,
    };
  },
  normalizeWebhookEvent: async (request) => {
    const body = await request.text();
    const hash = request.headers.get("x-paystack-signature");

    const computedHash = await import("crypto").then(({ createHmac }) =>
      createHmac("sha512", PAYSTACK_SECRET_KEY).update(body).digest("hex")
    );

    if (hash !== computedHash) {
      throw new Error("Invalid signature");
    }

    const event = JSON.parse(body);
    const data = event.data ?? {};

    return {
      type: event.event === "charge.success"
        ? "charge.success"
        : event.event === "charge.failed"
          ? "charge.failed"
          : "unknown",
      orderId: data.metadata?.order_id || null,
      reference: data.reference || null,
      amount: (data.amount ?? 0) / 100,
      currency: data.currency || "NGN",
      processor_response: event,
    };
  },
};

function createScaffoldAdapter(
  gateway: PaymentGateway,
  displayName: string,
  requiredEnvKeys: string[],
): PaymentGatewayAdapter {
  return {
    gateway,
    displayName,
    implemented: false,
    supportsCurrency: (currency, settings) =>
      settings.supported_currencies.includes(normalizeCurrencyCode(currency)),
    supportsMethod: (method, settings) =>
      settings.supported_methods.includes(method),
    getCredentialHealth: () =>
      buildCredentialHealth(requiredEnvKeys.map((key) => [key, process.env[key]])),
    createPaymentSession: async () => {
      throw new Error(`${displayName} is not yet enabled in this environment.`);
    },
    verifyPayment: async () => {
      throw new Error(`${displayName} verification is not yet enabled in this environment.`);
    },
    normalizeWebhookEvent: async () => ({
      type: "unknown",
      orderId: null,
      reference: null,
      amount: 0,
      currency: "NGN",
      processor_response: null,
    }),
  };
}

const adapters: Record<PaymentGateway, PaymentGatewayAdapter> = {
  paystack: paystackAdapter,
  stripe: createScaffoldAdapter(PAYMENT_GATEWAYS.STRIPE, "Stripe", [
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
  ]),
  paypal: createScaffoldAdapter(PAYMENT_GATEWAYS.PAYPAL, "PayPal", [
    "PAYPAL_CLIENT_ID",
    "PAYPAL_CLIENT_SECRET",
  ]),
  flutterwave: createScaffoldAdapter(PAYMENT_GATEWAYS.FLUTTERWAVE, "Flutterwave", [
    "FLUTTERWAVE_SECRET_KEY",
    "FLUTTERWAVE_WEBHOOK_SECRET",
  ]),
};

export function getPaymentGatewayAdapter(gateway: PaymentGateway) {
  return adapters[gateway];
}

export function getPaymentGatewayHealthMap(settings: PaymentGatewaySettings) {
  return (Object.keys(PAYMENT_GATEWAYS).map((key) => PAYMENT_GATEWAYS[key as keyof typeof PAYMENT_GATEWAYS]) as PaymentGateway[])
    .reduce<Record<PaymentGateway, PaymentGatewayHealth>>((acc, gateway) => {
      const adapter = getPaymentGatewayAdapter(gateway);
      const gatewaySettings = settings[gateway];
      const credentialHealth = adapter.getCredentialHealth();

      acc[gateway] = {
        gateway,
        display_name: getGatewayDisplayName(gateway, settings),
        status: gatewaySettings.enabled
          ? (credentialHealth.configured ? "configured" : "missing_credentials")
          : "disabled",
        configured: credentialHealth.configured,
        checkout_ready: gatewaySettings.enabled && credentialHealth.configured && adapter.implemented,
        implemented: adapter.implemented,
        missing_credentials: credentialHealth.missing_credentials,
      };

      return acc;
    }, {} as Record<PaymentGateway, PaymentGatewayHealth>);
}

export function getAvailablePaymentRoutes(params: {
  currency: string;
  settings: PaymentGatewaySettings;
  health: Record<PaymentGateway, PaymentGatewayHealth>;
}) {
  const normalizedCurrency = normalizeCurrencyCode(params.currency);

  const gateways = (Object.entries(params.settings) as Array<[PaymentGateway, PaymentGatewaySetting]>)
    .sort((a, b) => a[1].sort_order - b[1].sort_order);

  const routes: PaymentRouteOption[] = [];

  for (const [gateway, gatewaySettings] of gateways) {
    const health = params.health[gateway];
    const adapter = getPaymentGatewayAdapter(gateway);

    if (!health?.checkout_ready) continue;
    if (!adapter.supportsCurrency(normalizedCurrency, gatewaySettings)) continue;

    for (const method of gatewaySettings.supported_methods) {
      if (!adapter.supportsMethod(method, gatewaySettings)) continue;

      routes.push({
        gateway,
        method,
        gateway_label: getGatewayDisplayName(gateway, params.settings),
        method_label: getPaymentMethodLabel(method),
      });
    }
  }

  return routes;
}
