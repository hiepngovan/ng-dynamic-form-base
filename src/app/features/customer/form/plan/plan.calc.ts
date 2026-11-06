import {
  ASSET_KEYS,
  AUTO_CRITERIA_WEIGHT,
  COLLATERAL_SLOTS,
  CollateralSlot,
  CRITERIA,
  DOCS,
  EXPENSE_KEYS,
  LIABILITY_KEYS,
  LoanPlan,
  MEMBER_SLOTS,
  MemberSlot,
  MonthRow,
  Rating,
} from '../../plan.model';

/**
 * CÔNG THỨC của tab Phương án vay vốn — hàm thuần, không phụ thuộc Angular/Formly, test riêng
 * (plan.calc.spec.ts). Field tính trong form chỉ gọi các hàm này.
 * Quy ước: trả về null khi chưa đủ dữ liệu (field hiển thị "—" thay vì 0).
 */
type Plan = Partial<LoanPlan>;

const has = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const num = (v: unknown): number => (has(v) ? v : 0);
const sum = (values: unknown[]): number => values.reduce<number>((s, v) => s + num(v), 0);
/** Tổng, hoặc null nếu mọi giá trị đều trống. */
const sumOrNull = (values: unknown[]): number | null => (values.some(has) ? sum(values) : null);
const ratio = (a: number | null, b: number | null, k = 1): number | null =>
  a === null || !b ? null : (a / b) * k;
const upTo = <N extends number>(slots: readonly N[], count: unknown): N[] =>
  slots.filter((i) => i <= num(count));

// ───────────── Khoản vay ─────────────

export const graceMonths = (p: Plan): number => (p.hasGrace ? num(p.graceMonths) : 0);
export const repayMonths = (p: Plan): number => Math.max(num(p.termMonths) - graceMonths(p), 0);
const monthlyRate = (p: Plan): number => num(p.rate) / 100 / 12;

/** Số tiền trả mỗi kỳ sau ân hạn. Gốc đều: kỳ đầu tiên (lớn nhất). Gốc + lãi đều: niên kim. */
export function installment(p: Plan): number | null {
  const P = num(p.amount);
  const n = repayMonths(p);
  const r = monthlyRate(p);
  if (!P || !n) return null;
  if (p.method === 'EQUAL_PRINCIPAL') return P / n + P * r;
  return r === 0 ? P / n : (P * r) / (1 - (1 + r) ** -n);
}

export function totalInterest(p: Plan): number | null {
  const P = num(p.amount);
  const n = repayMonths(p);
  const r = monthlyRate(p);
  if (!P || !n) return null;
  const graceInterest = P * r * graceMonths(p);
  return p.method === 'EQUAL_PRINCIPAL'
    ? graceInterest + (P * r * (n + 1)) / 2
    : graceInterest + installment(p)! * n - P;
}

export function totalPayable(p: Plan): number | null {
  const i = totalInterest(p);
  return i === null ? null : num(p.amount) + i;
}

export function addMonths(d: Date, months: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + months);
  return r;
}

export function maturityDate(p: Plan): Date | null {
  return p.disburseDate instanceof Date && num(p.termMonths)
    ? addMonths(p.disburseDate, num(p.termMonths))
    : null;
}

// ───────────── Tài sản mua ─────────────

export const pricePerM2 = (p: Plan): number | null =>
  ratio(has(p.propPrice) ? p.propPrice : null, num(p.propArea));

export const carAge = (p: Plan, now = new Date()): number | null =>
  has(p.carYear) ? Math.max(now.getFullYear() - p.carYear, 0) : null;

// ───────────── Kinh doanh 12 tháng ─────────────

export function gross(r: Partial<MonthRow>): number | null {
  return has(r.revenue) || has(r.cogs) ? num(r.revenue) - num(r.cogs) : null;
}

export function net(r: Partial<MonthRow>): number | null {
  const g = gross(r);
  return g === null && !has(r.opex) ? null : num(g) - num(r.opex);
}

export function margin(r: Partial<MonthRow>): number | null {
  return ratio(net(r), num(r.revenue), 100);
}

const rows = (p: Plan): Partial<MonthRow>[] => p.months ?? [];
export const totalRevenue = (p: Plan) => sumOrNull(rows(p).map((r) => r.revenue));
export const totalCogs = (p: Plan) => sumOrNull(rows(p).map((r) => r.cogs));
export const totalOpex = (p: Plan) => sumOrNull(rows(p).map((r) => r.opex));
export const totalNet = (p: Plan) => sumOrNull(rows(p).map(net));
export const avgMargin = (p: Plan) => ratio(totalNet(p), totalRevenue(p), 100);
export function avgMonthlyNet(p: Plan): number | null {
  const t = totalNet(p);
  return t === null ? null : t / 12;
}
/** Hệ số khả năng trả nợ = lợi nhuận bình quân tháng / số tiền trả mỗi kỳ. */
export const dscr = (p: Plan) => ratio(avgMonthlyNet(p), installment(p));

// ───────────── Tài sản bảo đảm ─────────────

export const LTV_BY_TYPE: Record<string, number> = {
  BDS: 70,
  XE: 60,
  TIEN_GUI: 95,
  MMTB: 50,
  KHAC: 40,
};

export function eligible(p: Plan, i: CollateralSlot): number | null {
  const v = p[`c${i}Value`];
  const l = p[`c${i}Ltv`];
  return has(v) && has(l) ? (v * l) / 100 : null;
}

const activeCollaterals = (p: Plan) => upTo(COLLATERAL_SLOTS, p.collateralCount);
export const totalCollateral = (p: Plan) =>
  sumOrNull(activeCollaterals(p).map((i) => p[`c${i}Value`]));
export const totalEligible = (p: Plan) =>
  sumOrNull(activeCollaterals(p).map((i) => eligible(p, i)));
/** Tỷ lệ bảo đảm = giá trị TSBĐ được tính / số tiền vay (%). */
export const coverage = (p: Plan) => ratio(totalEligible(p), num(p.amount), 100);

// ───────────── Thu nhập, chi phí ─────────────

export const memberIncome = (p: Plan, i: MemberSlot): number =>
  num(p[`h${i}Income`]) + (p[`h${i}HasOther`] ? num(p[`h${i}OtherIncome`]) : 0);

/** Tổng thu nhập tháng của hộ; vay SXKD thì cộng thêm lợi nhuận kinh doanh bình quân tháng. */
export function totalIncome(p: Plan): number | null {
  const members = upTo(MEMBER_SLOTS, p.memberCount);
  const business = p.purpose === 'SXKD' ? avgMonthlyNet(p) : null;
  if (!members.some((i) => has(p[`h${i}Income`])) && business === null) return null;
  return sum(members.map((i) => memberIncome(p, i))) + num(business);
}

export const totalExpense = (p: Plan) => sumOrNull(EXPENSE_KEYS.map((k) => p[k]));

/** Thặng dư = thu nhập − chi phí sinh hoạt − trả nợ khoản vay này. */
export function surplus(p: Plan): number | null {
  const income = totalIncome(p);
  return income === null ? null : income - num(totalExpense(p)) - num(installment(p));
}

/** Tỷ lệ nợ / thu nhập (%) = (trả nợ khoản khác + trả nợ khoản này) / thu nhập. */
export function dti(p: Plan): number | null {
  const debt = num(p.expOtherLoans) + num(installment(p));
  return debt ? ratio(debt, totalIncome(p), 100) : null;
}

// ───────────── Cân đối tài sản ─────────────

export const totalAssets = (p: Plan) => sumOrNull(ASSET_KEYS.map((k) => p[k]));
export const totalLiabilities = (p: Plan) => sumOrNull(LIABILITY_KEYS.map((k) => p[k]));
export function equity(p: Plan): number | null {
  const a = totalAssets(p);
  const l = totalLiabilities(p);
  return a === null && l === null ? null : num(a) - num(l);
}
export const leverage = (p: Plan) => ratio(totalLiabilities(p), totalAssets(p), 100);

// ───────────── Chấm điểm, hồ sơ ─────────────

export function scoreCoverage(p: Plan): number | null {
  if (p.collateralCount === 0) return 0;
  const c = coverage(p);
  return c === null ? null : c >= 150 ? 10 : c >= 100 ? 5 : 0;
}

export function scoreDti(p: Plan): number | null {
  const d = dti(p);
  return d === null ? null : d <= 40 ? 10 : d <= 60 ? 5 : 0;
}

/** Tổng điểm (tối đa 100). null khi còn tiêu chí chưa chấm. */
export function scoreTotal(p: Plan): number | null {
  const manual = CRITERIA.map((c) => p[`score${c.code}`]);
  const cov = scoreCoverage(p);
  const d = scoreDti(p);
  if (!manual.every(has) || cov === null || d === null) return null;
  return (
    CRITERIA.reduce((s, c) => s + num(p[`score${c.code}`]) * c.weight, 0) +
    cov * AUTO_CRITERIA_WEIGHT.coverage +
    d * AUTO_CRITERIA_WEIGHT.dti
  );
}

export function rating(p: Plan): Rating | null {
  const s = scoreTotal(p);
  if (s === null) return null;
  return s >= 80 ? 'A' : s >= 65 ? 'B' : s >= 50 ? 'C' : 'D';
}

export const docApplies = (doc: (typeof DOCS)[number], purpose: Plan['purpose']): boolean =>
  !('only' in doc) || (!!purpose && (doc.only as readonly string[]).includes(purpose));

export function docProgress(p: Plan): number | null {
  const docs = DOCS.filter((d) => docApplies(d, p.purpose));
  return docs.length ? (docs.filter((d) => p[`doc${d.code}`]).length / docs.length) * 100 : null;
}
