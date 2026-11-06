import * as calc from './plan.calc';
import { CRITERIA, DOCS } from '../../plan.model';

describe('Công thức Phương án vay (plan.calc)', () => {
  const loan = { amount: 120_000_000, termMonths: 12, rate: 12 };

  it('gốc + lãi đều: niên kim', () => {
    expect(calc.installment({ ...loan, method: 'ANNUITY' })).toBeCloseTo(10_661_854.9, 0);
    expect(calc.totalInterest({ ...loan, method: 'ANNUITY' })).toBeCloseTo(7_942_259, -1);
  });

  it('gốc đều: kỳ đầu = gốc/n + lãi tháng; tổng lãi = P·r·(n+1)/2', () => {
    const p = { ...loan, method: 'EQUAL_PRINCIPAL' as const };
    expect(calc.installment(p)).toBe(11_200_000);
    expect(calc.totalInterest(p)).toBeCloseTo(7_800_000, 4);
  });

  it('ân hạn: rút ngắn số kỳ trả gốc, cộng lãi các tháng ân hạn', () => {
    const p = { ...loan, method: 'EQUAL_PRINCIPAL' as const, hasGrace: true, graceMonths: 2 };
    expect(calc.repayMonths(p)).toBe(10);
    expect(calc.installment(p)).toBe(13_200_000);
    expect(calc.totalInterest(p)).toBeCloseTo(2_400_000 + 6_600_000, 4);
    // Bỏ tick ân hạn thì số tháng ân hạn không còn tác dụng
    expect(calc.repayMonths({ ...p, hasGrace: false })).toBe(12);
  });

  it('chưa đủ dữ liệu → null (không phải 0)', () => {
    expect(calc.installment({ amount: 100 })).toBeNull();
    expect(calc.totalPayable({})).toBeNull();
    expect(calc.maturityDate({ termMonths: 12 })).toBeNull();
    expect(calc.gross({})).toBeNull();
    expect(calc.margin({ revenue: 0, cogs: 0 })).toBeNull();
    expect(calc.coverage({ amount: 100 })).toBeNull();
  });

  it('ngày đáo hạn = ngày giải ngân + thời hạn', () => {
    expect(calc.maturityDate({ disburseDate: new Date(2026, 11, 1), termMonths: 60 })).toEqual(
      new Date(2031, 11, 1),
    );
  });

  it('bảng 12 tháng: lãi gộp, lợi nhuận, biên, tổng và DSCR', () => {
    const row = { revenue: 1000, cogs: 600, opex: 150 };
    expect(calc.gross(row)).toBe(400);
    expect(calc.net(row)).toBe(250);
    expect(calc.margin(row)).toBe(25);

    const months = Array.from({ length: 12 }, () => ({ ...row }));
    const p = { months, amount: 1200, termMonths: 12, rate: 0 };
    expect(calc.totalRevenue(p)).toBe(12_000);
    expect(calc.totalNet(p)).toBe(3_000);
    expect(calc.avgMonthlyNet(p)).toBe(250);
    expect(calc.dscr(p)).toBe(2.5); // 250 / (1200 / 12)
  });

  it('TSBĐ: chỉ tính các tài sản trong phạm vi "Số tài sản"', () => {
    const p = {
      amount: 1000,
      collateralCount: 1,
      c1Value: 1000,
      c1Ltv: 70,
      c2Value: 5000,
      c2Ltv: 50,
    };
    expect(calc.totalEligible(p)).toBe(700);
    expect(calc.coverage(p)).toBe(70);
    expect(calc.coverage({ ...p, collateralCount: 2 })).toBe(320);
    expect(calc.scoreCoverage({ ...p, collateralCount: 2 })).toBe(10);
    expect(calc.scoreCoverage({ ...p, collateralCount: 0 })).toBe(0);
  });

  it('thu nhập: cộng thu nhập khác khi có tick; vay SXKD cộng lợi nhuận KD', () => {
    const p = {
      memberCount: 2,
      h1Income: 10,
      h2Income: 5,
      h2HasOther: true,
      h2OtherIncome: 3,
      h3Income: 100, // ngoài phạm vi memberCount
    };
    expect(calc.totalIncome(p)).toBe(18);
    expect(calc.totalIncome({ ...p, h2HasOther: false })).toBe(15);
    const months = Array.from({ length: 12 }, () => ({ revenue: 12, cogs: 0, opex: 0 }));
    expect(calc.totalIncome({ ...p, purpose: 'SXKD', months })).toBe(30);
  });

  it('DTI và thặng dư', () => {
    const p = { memberCount: 1, h1Income: 100, expOtherLoans: 20, expFood: 30 };
    expect(calc.dti(p)).toBe(20);
    expect(calc.surplus(p)).toBe(50);
    expect(calc.scoreDti(p)).toBe(10);
  });

  it('chấm điểm: chỉ có tổng khi đã chấm đủ; xếp hạng theo ngưỡng', () => {
    const all = (v: number) => Object.fromEntries(CRITERIA.map((c) => [`score${c.code}`, v]));
    const base = { collateralCount: 0, memberCount: 1, h1Income: 100, expOtherLoans: 10 };
    expect(calc.scoreTotal({ ...base, scoreAge: 10 })).toBeNull();
    // 8 × 10 (tay) + 0 (không TSBĐ) + 10 (DTI 10%) = 90
    expect(calc.scoreTotal({ ...base, ...all(10) })).toBeCloseTo(90);
    expect(calc.rating({ ...base, ...all(10) })).toBe('A');
    expect(calc.rating({ ...base, ...all(0) })).toBe('D');
  });

  it('hồ sơ: chỉ tính hồ sơ áp dụng cho mục đích vay', () => {
    const general = DOCS.filter((d) => !('only' in d));
    const p = Object.fromEntries(general.map((d) => [`doc${d.code}`, true]));
    expect(calc.docProgress(p)).toBe(100);
    expect(calc.docProgress({ ...p, purpose: 'SXKD' })).toBeLessThan(100);
  });
});
