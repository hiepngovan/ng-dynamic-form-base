import { LoanApplication } from '../loan.model';

/** Công thức của hồ sơ vay — hàm thuần, có unit test (loan.calc.spec.ts). */
type M = Partial<LoanApplication>;

/** Trả góp đều hàng tháng (gốc + lãi). Lãi suất 0 → chia đều gốc. */
export function installment(m: M): number | null {
  const P = m.amount ?? 0;
  const n = m.termMonths ?? 0;
  if (!P || !n || m.rate === null || m.rate === undefined) return null;
  const r = m.rate / 100 / 12;
  return r === 0 ? P / n : (P * r) / (1 - (1 + r) ** -n);
}

/** Tỷ lệ nợ / thu nhập (%) = (nợ khác + khoản trả của khoản vay này) / thu nhập. */
export function dti(m: M): number | null {
  const income = m.monthlyIncome ?? 0;
  const pay = installment(m);
  if (!income || pay === null) return null;
  return (((m.monthlyDebt ?? 0) + pay) / income) * 100;
}

/** Tỷ lệ cho vay trên giá trị tài sản bảo đảm (%). */
export function ltv(m: M): number | null {
  if (!m.hasCollateral || !m.collateralValue || !m.amount) return null;
  return (m.amount / m.collateralValue) * 100;
}

export const MAX_DTI = 60;
export const MAX_LTV = 70;
