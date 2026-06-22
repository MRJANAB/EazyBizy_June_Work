import type { GTABWorkingCapitalPeriod } from "@/types/gtab";

export const getMonthlyWorkingCapital = (
  amount: number | null | undefined,
  period: GTABWorkingCapitalPeriod,
) => {
  const numericAmount = Number(amount || 0);
  return period === "annual" ? numericAmount / 12 : numericAmount;
};

export const getAnnualWorkingCapital = (
  amount: number | null | undefined,
  period: GTABWorkingCapitalPeriod,
) => {
  const numericAmount = Number(amount || 0);
  return period === "monthly" ? numericAmount * 12 : numericAmount;
};
