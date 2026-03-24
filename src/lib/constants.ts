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

export function getShippingZone(state: string): string {
  return SHIPPING_ZONES[state.toLowerCase().trim()] ?? "Z2"; // default to Z2 if unknown
}

export function calcShippingCost(
  weightGrams: number,
  zone: string,
  shippingRates: Record<string, { constant: number; variable: number }>
): number {
  const rates = shippingRates[zone];
  if (!rates) return 0;
  const weightKg = weightGrams / 1000;
  const raw = rates.constant + rates.variable * Math.max(0, weightKg - 1);
  return Math.ceil(raw / 100) * 100; // round up to nearest 100
}