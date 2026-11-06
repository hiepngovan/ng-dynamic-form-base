import { dti, installment, ltv } from './loan.calc';

describe('Công thức hồ sơ vay', () => {
  it('trả góp đều: 120tr, 12 tháng, 12%/năm ≈ 10.661.855 ₫/tháng', () => {
    expect(installment({ amount: 120_000_000, termMonths: 12, rate: 12 })).toBeCloseTo(
      10_661_854.9,
      0,
    );
  });

  it('lãi suất 0 → chia đều gốc; thiếu dữ liệu → null', () => {
    expect(installment({ amount: 120_000_000, termMonths: 12, rate: 0 })).toBe(10_000_000);
    expect(installment({ amount: 120_000_000, termMonths: 12 })).toBeNull();
    expect(installment({ termMonths: 12, rate: 10 })).toBeNull();
  });

  it('DTI = (nợ khác + trả hàng tháng) / thu nhập', () => {
    const m = {
      amount: 120_000_000,
      termMonths: 12,
      rate: 0,
      monthlyIncome: 40_000_000,
      monthlyDebt: 2_000_000,
    };
    expect(dti(m)).toBe(30);
    expect(dti({ ...m, monthlyIncome: 0 })).toBeNull();
  });

  it('LTV chỉ tính khi có tài sản bảo đảm', () => {
    expect(ltv({ hasCollateral: true, amount: 700, collateralValue: 1000 })).toBe(70);
    expect(ltv({ hasCollateral: false, amount: 700, collateralValue: 1000 })).toBeNull();
  });
});
