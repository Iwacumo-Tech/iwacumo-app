export const USER_ROLES = {
  SUPER_ADMIN: "super-admin",
  ADMIN: "admin",
  PUBLISHER: "publisher",
  AUTHOR: "author",
  CUSTOMER: "customer",
};

export const PERMISSIONS = {
  PUBLISHER: "publisher",
  AUTHOR: "author",
  CUSTOMER: "customer",
  OWNER: "owner",
  SUPER_ADMIN: "super-admin"
};

export const SHIPPING_PROVIDERS = {
  SPEEDAF: "speedaf",
  FEZ: "fez",
} as const;

export type ShippingProvider = (typeof SHIPPING_PROVIDERS)[keyof typeof SHIPPING_PROVIDERS];
export type ShippingRateBand = { constant: number; variable: number };
export type SpeedafShippingRates = Record<string, ShippingRateBand>;
export type FezShippingRates = {
  kg_cutoff: number;
  G1: ShippingRateBand;
  G2: ShippingRateBand;
  G3: ShippingRateBand;
  G4: ShippingRateBand;
  G5: ShippingRateBand;
  G6: ShippingRateBand;
};
export type ShippingProviderOptions = {
  speedaf: { enabled: boolean };
  fez: { enabled: boolean };
};

export const DEFAULT_SPEEDAF_SHIPPING_RATES: SpeedafShippingRates = {
  Z1: { constant: 1500, variable: 200 },
  Z2: { constant: 2000, variable: 250 },
  Z3: { constant: 1200, variable: 180 },
  Z4: { constant: 1000, variable: 150 },
};

export const DEFAULT_FEZ_SHIPPING_RATES: FezShippingRates = {
  kg_cutoff: 3,
  G1: { constant: 1200, variable: 400 },
  G2: { constant: 1800, variable: 500 },
  G3: { constant: 2200, variable: 600 },
  G4: { constant: 2000, variable: 550 },
  G5: { constant: 2800, variable: 700 },
  G6: { constant: 3200, variable: 750 },
};

export const DEFAULT_SHIPPING_PROVIDER_OPTIONS: ShippingProviderOptions = {
  speedaf: { enabled: true },
  fez: { enabled: false },
};

export const SHIPPING_ZONES: Record<string, string> = {
  abia: "Z1", "akwa ibom": "Z1", anambra: "Z1", bayelsa: "Z1",
  "cross river": "Z1", delta: "Z1", edo: "Z1", enugu: "Z1",
  fct: "Z1", imo: "Z1", rivers: "Z1",
  adamawa: "Z2", bauchi: "Z2", benue: "Z2", borno: "Z2",
  ebonyi: "Z2", gombe: "Z2", jigawa: "Z2", kaduna: "Z2",
  kano: "Z2", katsina: "Z2", kebbi: "Z2", kogi: "Z2",
  kwara: "Z2", nasarawa: "Z2", niger: "Z2", plateau: "Z2",
  sokoto: "Z2", taraba: "Z2", yobe: "Z2", zamfara: "Z2",
  ekiti: "Z3", ogun: "Z3", ondo: "Z3", osun: "Z3", oyo: "Z3",
  lagos: "Z4",
};

export const FEZ_SHIPPING_GROUPS: Record<string, string> = {
  lagos: "G1",
  ogun: "G2", ondo: "G2", osun: "G2", oyo: "G2",
  abia: "G3", anambra: "G3", bayelsa: "G3", delta: "G3", ebonyi: "G3",
  edo: "G3", enugu: "G3", imo: "G3", kwara: "G3", rivers: "G3",
  fct: "G4",
  adamawa: "G5", bauchi: "G5", benue: "G5", borno: "G5", gombe: "G5",
  jigawa: "G5", kaduna: "G5", kano: "G5", katsina: "G5", kebbi: "G5",
  kogi: "G5", nasarawa: "G5", niger: "G5", plateau: "G5", sokoto: "G5",
  taraba: "G5", yobe: "G5", zamfara: "G5",
  "akwa ibom": "G6", "cross river": "G6",
};

export function getShippingZone(state: string): string {
  return SHIPPING_ZONES[state.toLowerCase().trim()] ?? "Z2"; // default to Z2 if unknown
}

export function getFezShippingGroup(state: string): string {
  return FEZ_SHIPPING_GROUPS[state.toLowerCase().trim()] ?? "G5";
}

export function calcShippingCost(
  weightGrams: number,
  zone: string,
  shippingRates: SpeedafShippingRates
): number {
  const rates = shippingRates[zone];
  if (!rates) return 0;
  const weightKg = weightGrams / 1000;
  const raw = rates.constant + rates.variable * Math.max(0, weightKg - 1);
  return Math.ceil(raw / 100) * 100; // round up to nearest 100
}

export function calcFezShippingCost(
  weightGrams: number,
  group: string,
  shippingRates: FezShippingRates
): number {
  const rates = shippingRates[group as keyof Omit<FezShippingRates, "kg_cutoff">];
  if (!rates || typeof rates !== "object") return 0;

  const weightKgRoundedUp = Math.max(1, Math.ceil(weightGrams / 1000));
  const raw = weightKgRoundedUp <= shippingRates.kg_cutoff
    ? rates.constant
    : rates.constant + rates.variable * (weightKgRoundedUp - shippingRates.kg_cutoff);

  return Math.ceil(raw / 100) * 100;
}

export function getShippingLabel(provider: ShippingProvider, state: string): string {
  return provider === SHIPPING_PROVIDERS.FEZ
    ? getFezShippingGroup(state)
    : getShippingZone(state);
}

export function calcShippingCostForProvider(args: {
  provider: ShippingProvider;
  state: string;
  weightGrams: number;
  speedafRates?: SpeedafShippingRates;
  fezRates?: FezShippingRates;
}) {
  const { provider, state, weightGrams, speedafRates, fezRates } = args;

  if (provider === SHIPPING_PROVIDERS.FEZ) {
    const group = getFezShippingGroup(state);
    return {
      provider,
      label: group,
      amount: calcFezShippingCost(weightGrams, group, fezRates ?? DEFAULT_FEZ_SHIPPING_RATES),
    };
  }

  const zone = getShippingZone(state);
  return {
    provider,
    label: zone,
    amount: calcShippingCost(weightGrams, zone, speedafRates ?? DEFAULT_SPEEDAF_SHIPPING_RATES),
  };
}
