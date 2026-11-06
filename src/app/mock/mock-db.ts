import { Customer, CustomerRow } from '../features/customer/customer.model';
import { docApplies } from '../features/customer/form/plan/plan.calc';
import { CRITERIA, DOCS, LoanPlan, MONTH_ROWS } from '../features/customer/form/plan/plan.model';
import { PROVINCES } from '../core/master-data.service';

/**
 * DỮ LIỆU GIẢ cho mock backend (chỉ dùng khi chưa có API thật).
 * Bản ghi đầu tiên là hồ sơ mẫu đầy đủ (có Phương án vay ~280 field), còn lại sinh ngẫu nhiên.
 */
export function seedCustomers(count = 236): Customer[] {
  const first = { ...sampleCustomer(), id: 'c1', createdAt: new Date(2026, 10, 2) } as Customer;
  const ho = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Ngô'];
  const dem = ['Văn', 'Thị', 'Minh', 'Thu', 'Đức', 'Ngọc', 'Quốc', 'Hải'];
  const ten = [
    'An',
    'Bình',
    'Chi',
    'Dũng',
    'Giang',
    'Hà',
    'Hùng',
    'Lan',
    'Minh',
    'Nam',
    'Phương',
    'Quân',
    'Sơn',
    'Tâm',
    'Uyên',
    'Vy',
  ];
  const company = ['Công ty TNHH', 'Công ty CP', 'Doanh nghiệp tư nhân'];
  const biz = [
    'Thương mại Hoà Phát',
    'Xây dựng Sông Hồng',
    'Logistics Bắc Nam',
    'Thực phẩm Sạch Việt',
    'Công nghệ An Khang',
    'Vật tư Minh Long',
  ];
  const statuses = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'SUSPENDED', 'CLOSED'];
  // mulberry32: ngẫu nhiên nhưng cố định giữa các lần chạy (dữ liệu demo ổn định).
  let seed = 42;
  const rnd = (n: number) => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * n);
  };
  const rest = Array.from({ length: count - 1 }, (_, i) => {
    const isCompany = rnd(4) === 0;
    const fullName = isCompany
      ? `${company[rnd(company.length)]} ${biz[rnd(biz.length)]} ${i + 1}`
      : `${ho[rnd(ho.length)]} ${dem[rnd(dem.length)]} ${ten[rnd(ten.length)]}`;
    return {
      id: `c${i + 2}`,
      code: `KH${String(1000 + i).padStart(6, '0')}`,
      customerType: isCompany ? 'COMPANY' : 'PERSONAL',
      fullName,
      phone: `09${String(10000000 + rnd(89999999)).padStart(8, '0')}`,
      email: null,
      provinceId: PROVINCES[rnd(PROVINCES.length)].value as string,
      street: `${1 + rnd(200)} Đường số ${1 + rnd(30)}`,
      status: statuses[rnd(statuses.length)],
      industryId: `IND${1 + rnd(8)}`,
      customerGroupId: `G${1 + rnd(5)}`,
      creditLimit: rnd(3) === 0 ? null : (1 + rnd(50)) * 10_000_000,
      createdAt: new Date(2024, rnd(24), 1 + rnd(28)),
    } as unknown as Customer;
  });
  return [first, ...rest];
}

export function toRow(c: Customer): CustomerRow {
  return {
    id: c.id!,
    code: c.code ?? '',
    fullName: c.fullName ?? '',
    customerType: c.customerType ?? 'PERSONAL',
    phone: c.phone,
    provinceName: PROVINCES.find((p) => p.value === c.provinceId)?.label ?? null,
    status: c.status ?? 'ACTIVE',
    creditLimit: c.creditLimit ?? null,
    createdAt: (c as Customer & { createdAt: Date }).createdAt,
  };
}

export function sampleCustomer(): Partial<Customer> {
  const extra: Record<string, unknown> = {};
  for (let i = 1; i <= 90; i += 5) extra[`f${String(i).padStart(3, '0')}`] = `Giá trị ${i}`;
  return {
    customerType: 'PERSONAL',
    code: 'KH000123',
    fullName: 'Nguyễn Văn An',
    shortName: 'An Nguyễn',
    dob: new Date(1990, 4, 12),
    gender: 'M',
    identityNo: '001090012345',
    identityIssueDate: new Date(2021, 6, 1),
    identityExpiryDate: new Date(2030, 4, 12),
    identityIssuePlace: 'Cục CS QLHC về TTXH',
    industryId: 'IND4',
    customerGroupId: 'G4',
    status: 'ACTIVE',
    sourceId: 'S2',
    salesStaffId: 'NV042',
    phone: '0912345678',
    email: 'an.nguyen@example.com',
    provinceId: 'HN',
    wardId: 'HN-W03',
    street: '12 Tràng Tiền',
    sameAddress: true,
    currency: 'VND',
    creditLimit: 500_000_000,
    deposit: 50_000_000,
    paymentTermDays: 30,
    discountRate: 2.5,
    paymentMethod: 'TRANSFER',
    bankId: 'VIETCOMBANK',
    bankAccountNo: '0011001234567',
    bankAccountName: 'NGUYEN VAN AN',
    vatRegistered: false,
    contacts: [
      {
        fullName: 'Trần Thị Bình',
        position: 'Kế toán',
        phone: '0987654321',
        email: 'binh@example.com',
        isPrimary: true,
      },
      {
        fullName: 'Lê Văn Chi',
        position: 'Thủ kho',
        phone: '0977000111',
        email: null,
        isPrimary: false,
      },
    ],
    extra,
    plan: samplePlan(),
  };
}

/** Phương án vay SXKD đầy đủ: hiện ~280 field trên tab Phương án vay. */
function samplePlan(): Partial<LoanPlan> {
  const docDate = new Date(2026, 10, 2);
  const docs = Object.fromEntries(
    DOCS.filter((d) => docApplies(d, 'SXKD')).flatMap((d) => [
      [`doc${d.code}`, true],
      [`doc${d.code}Date`, docDate],
    ]),
  );
  const scores = Object.fromEntries(
    CRITERIA.map((c, i) => [`score${c.code}`, i % 4 === 3 ? 5 : 10]),
  );
  return {
    purpose: 'SXKD',
    amount: 2_000_000_000,
    termMonths: 60,
    rate: 9.5,
    method: 'ANNUITY',
    hasGrace: true,
    graceMonths: 6,
    disburseDate: new Date(2026, 11, 1),
    firstPaymentDate: new Date(2027, 0, 1),
    bizName: 'Cửa hàng vật liệu xây dựng An Phát',
    bizType: 'RETAIL',
    bizYears: 8,
    bizEmployees: 12,
    bizMarket: 'Hà Nội và các tỉnh lân cận',
    bizProducts: 'Xi măng, sắt thép, gạch ốp lát',
    months: MONTH_ROWS.map((r, i) => {
      const revenue = 800_000_000 + i * 30_000_000;
      return { ...r, revenue, cogs: Math.round(revenue * 0.68), opex: 120_000_000 };
    }),
    collateralCount: 2,
    c1Type: 'BDS',
    c1Desc: 'Nhà 4 tầng số 12 Tràng Tiền, Hoàn Kiếm',
    c1Value: 2_500_000_000,
    c1Ltv: 70,
    c1Owner: 'SELF',
    c1CertNo: 'CS 123456',
    c2Type: 'XE',
    c2Desc: 'Xe tải Hino 8 tấn, 2023',
    c2Value: 800_000_000,
    c2Ltv: 60,
    c2Owner: 'THIRD',
    c2OwnerName: 'Nguyễn Thị Hoa',
    c2OwnerRelation: 'SPOUSE',
    memberCount: 2,
    h1Name: 'Nguyễn Văn An',
    h1Relation: 'SELF',
    h1Job: 'BUSINESS',
    h1Income: 30_000_000,
    h1HasOther: false,
    h2Name: 'Nguyễn Thị Hoa',
    h2Relation: 'SPOUSE',
    h2Job: 'SALARY',
    h2Employer: 'Công ty CP ABC',
    h2Income: 18_000_000,
    h2HasOther: true,
    h2OtherIncome: 5_000_000,
    h2OtherSource: 'Cho thuê nhà',
    expFood: 12_000_000,
    expUtilities: 3_000_000,
    expEducation: 5_000_000,
    expHealth: 1_000_000,
    expTransport: 2_000_000,
    expInsurance: 1_000_000,
    expOtherLoans: 8_000_000,
    expOther: 2_000_000,
    asCash: 150_000_000,
    asDeposit: 400_000_000,
    asReceivable: 600_000_000,
    asInventory: 1_200_000_000,
    asVehicle: 800_000_000,
    asRealEstate: 2_500_000_000,
    liShort: 500_000_000,
    liPayable: 300_000_000,
    ...scores,
    ...docs,
    recommendAmount: 2_000_000_000,
    recommendTerm: 60,
    decision: 'CONDITIONAL',
    conditions: 'Bổ sung hợp đồng bảo hiểm tài sản trước khi giải ngân',
    opinion: 'Phương án khả thi, dòng tiền ổn định, tài sản bảo đảm đủ điều kiện.',
  };
}
