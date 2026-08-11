export type CampPackageId = "essencial" | "completo";

export type CampPackage = {
  id: CampPackageId;
  name: string;
  amountCents: number;
  currency: "eur";
  description: string;
  available: boolean;
};

export const CAMP_PACKAGES: Record<CampPackageId, CampPackage> = {
  essencial: {
    id: "essencial",
    name: "Pacote Essencial",
    amountCents: 9000,
    currency: "eur",
    description: "2 dias de treino, workshop e jogos + kit do evento",
    available: true,
  },
  completo: {
    id: "completo",
    name: "Pacote Completo",
    amountCents: 18000,
    currency: "eur",
    description: "Treino + barco + alojamento (3 noites) + kit do evento",
    available: false,
  },
};

export function isCampPackageId(value: string): value is CampPackageId {
  return value === "essencial" || value === "completo";
}
