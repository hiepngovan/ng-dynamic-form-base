import { SelectOption } from '../../shared/dynamic-form';

/**
 * Model của tab "Phương án vay vốn" (tab có key 'plan' → customer.plan = { ... }).
 * Nhóm lặp cố định (tài sản 1..5, thành viên 1..4, hồ sơ, tiêu chí) dùng key phẳng có đánh số,
 * sinh bằng kiểu Indexed để builder vẫn kiểm tra tên key khi compile.
 */
export type LoanPurpose = 'SXKD' | 'BDS' | 'OTO' | 'TIEU_DUNG';
export type Rating = 'A' | 'B' | 'C' | 'D';

export const COLLATERAL_SLOTS = [1, 2, 3, 4, 5] as const;
export const MEMBER_SLOTS = [1, 2, 3, 4] as const;
export type CollateralSlot = (typeof COLLATERAL_SLOTS)[number];
export type MemberSlot = (typeof MEMBER_SLOTS)[number];

/** Indexed<'c', 1 | 2, { Value: number }> = { c1Value: number; c2Value: number } */
type Indexed<P extends string, N extends number | string, I> = {
  [K in keyof I & string as `${P}${N}${K}`]: I[K];
};

export interface CollateralItem {
  Type: string | null;
  Desc: string | null;
  Value: number | null;
  Ltv: number | null;
  Owner: 'SELF' | 'THIRD' | null;
  OwnerName: string | null;
  OwnerRelation: string | null;
  CertNo: string | null;
  /** tính: Value × Ltv */
  Eligible: number | null;
}

export interface MemberItem {
  Name: string | null;
  Relation: string | null;
  Job: string | null;
  Employer: string | null;
  Income: number | null;
  HasOther: boolean;
  OtherIncome: number | null;
  OtherSource: string | null;
}

export interface MonthRow {
  month: number;
  label: string;
  revenue: number | null;
  cogs: number | null;
  opex: number | null;
  /** tính */
  gross: number | null;
  net: number | null;
  margin: number | null;
}

interface DocDef {
  code: string;
  label: string;
  /** Chỉ áp dụng cho các mục đích vay này (không khai báo = mọi mục đích). */
  only?: readonly LoanPurpose[];
}

export const DOCS = [
  { code: 'Cccd', label: 'CCCD / Hộ chiếu' },
  { code: 'CuTru', label: 'Xác nhận cư trú' },
  { code: 'HonNhan', label: 'Xác nhận tình trạng hôn nhân' },
  { code: 'DeNghi', label: 'Giấy đề nghị vay vốn' },
  { code: 'SaoKe', label: 'Sao kê tài khoản 6 tháng' },
  { code: 'HdLaoDong', label: 'Hợp đồng lao động' },
  { code: 'BangLuong', label: 'Bảng lương 3 tháng gần nhất' },
  { code: 'Dkkd', label: 'Đăng ký kinh doanh', only: ['SXKD'] },
  { code: 'Bctc', label: 'Báo cáo tài chính 2 năm', only: ['SXKD'] },
  { code: 'ToKhaiThue', label: 'Tờ khai thuế 4 quý', only: ['SXKD'] },
  { code: 'HdDauVao', label: 'Hợp đồng đầu vào', only: ['SXKD'] },
  { code: 'HdDauRa', label: 'Hợp đồng đầu ra', only: ['SXKD'] },
  { code: 'PhuongAn', label: 'Phương án kinh doanh chi tiết', only: ['SXKD'] },
  { code: 'HdMuaBan', label: 'Hợp đồng mua bán nhà đất', only: ['BDS'] },
  { code: 'SoDo', label: 'Giấy chứng nhận QSDĐ', only: ['BDS'] },
  { code: 'QuyHoach', label: 'Thông tin quy hoạch', only: ['BDS'] },
  { code: 'HdMuaXe', label: 'Hợp đồng mua xe', only: ['OTO'] },
  { code: 'DangKyXe', label: 'Đăng ký xe / phiếu xuất xưởng', only: ['OTO'] },
  { code: 'BaoHiemXe', label: 'Bảo hiểm vật chất xe', only: ['OTO'] },
  { code: 'DinhGia', label: 'Chứng thư định giá TSBĐ' },
  { code: 'CamKet', label: 'Cam kết của bên bảo đảm' },
  { code: 'Cic', label: 'Kết quả tra cứu CIC' },
  { code: 'XacMinh', label: 'Biên bản xác minh thực tế' },
  { code: 'HinhAnh', label: 'Hình ảnh tài sản / cơ sở kinh doanh' },
  { code: 'Khac', label: 'Hồ sơ khác' },
] as const satisfies readonly DocDef[];
export type DocCode = (typeof DOCS)[number]['code'];

/** Tiêu chí chấm điểm nhập tay. Tổng trọng số 8 + 2 tiêu chí tự tính (mỗi tiêu chí 1) = 10 → tối đa 100 điểm. */
export const CRITERIA = [
  { code: 'Age', label: 'Độ tuổi', weight: 0.4 },
  { code: 'Edu', label: 'Trình độ học vấn', weight: 0.4 },
  { code: 'Job', label: 'Tính ổn định công việc', weight: 0.8 },
  { code: 'WorkYears', label: 'Thời gian công tác / kinh doanh', weight: 0.6 },
  { code: 'Residence', label: 'Tình trạng cư trú', weight: 0.4 },
  { code: 'Dependents', label: 'Số người phụ thuộc', weight: 0.4 },
  { code: 'CreditHistory', label: 'Lịch sử tín dụng (CIC)', weight: 1.2 },
  { code: 'Relationship', label: 'Quan hệ với ngân hàng', weight: 0.6 },
  { code: 'Deposit', label: 'Số dư tiền gửi', weight: 0.4 },
  { code: 'Market', label: 'Thị trường / ngành nghề', weight: 0.6 },
  { code: 'Management', label: 'Năng lực quản lý', weight: 0.6 },
  { code: 'Plan', label: 'Tính khả thi của phương án', weight: 0.8 },
  { code: 'Legal', label: 'Pháp lý tài sản', weight: 0.4 },
  { code: 'Liquidity', label: 'Tính thanh khoản tài sản', weight: 0.4 },
] as const;
export type CriterionCode = (typeof CRITERIA)[number]['code'];
export const AUTO_CRITERIA_WEIGHT = { coverage: 1, dti: 1 } as const;

export const SCORE_OPTIONS: SelectOption<number>[] = [
  { value: 10, label: 'Tốt (10)' },
  { value: 5, label: 'Trung bình (5)' },
  { value: 0, label: 'Kém (0)' },
];

export const EXPENSE_KEYS = [
  'expFood',
  'expHousing',
  'expUtilities',
  'expEducation',
  'expHealth',
  'expTransport',
  'expInsurance',
  'expOtherLoans',
  'expOther',
] as const;
export const ASSET_KEYS = [
  'asCash',
  'asDeposit',
  'asReceivable',
  'asInventory',
  'asVehicle',
  'asRealEstate',
  'asEquipment',
  'asInvestment',
  'asOther',
] as const;
export const LIABILITY_KEYS = ['liShort', 'liLong', 'liPayable', 'liOther'] as const;

type Expenses = Record<(typeof EXPENSE_KEYS)[number], number | null>;
type Assets = Record<(typeof ASSET_KEYS)[number], number | null>;
type Liabilities = Record<(typeof LIABILITY_KEYS)[number], number | null>;
type Docs = { [K in DocCode as `doc${K}`]: boolean } & {
  [K in DocCode as `doc${K}Date`]: Date | null;
};
type Scores = { [K in CriterionCode as `score${K}`]: number | null };

export type LoanPlan = Indexed<'c', CollateralSlot, CollateralItem> &
  Indexed<'h', MemberSlot, MemberItem> &
  Expenses &
  Assets &
  Liabilities &
  Docs &
  Scores & {
    // ── Khoản vay
    purpose: LoanPurpose | null;
    amount: number | null;
    termMonths: number | null;
    rate: number | null;
    method: 'ANNUITY' | 'EQUAL_PRINCIPAL' | null;
    hasGrace: boolean;
    graceMonths: number | null;
    disburseDate: Date | null;
    firstPaymentDate: Date | null;
    installment: number | null;
    totalInterest: number | null;
    totalPayable: number | null;
    maturityDate: Date | null;

    // ── Bất động sản
    propType: 'HOUSE' | 'APARTMENT' | 'LAND' | null;
    propAddress: string | null;
    propProvinceId: string | null;
    propArea: number | null;
    propLandArea: number | null;
    propFloors: number | null;
    propProject: string | null;
    propApartmentNo: string | null;
    propCertStatus: 'HAS' | 'WAITING' | null;
    propCertNo: string | null;
    propExpectedCertDate: Date | null;
    propPrice: number | null;
    propPricePerM2: number | null;
    propSeller: string | null;

    // ── Ô tô
    carBrand: string | null;
    carModel: string | null;
    carYear: number | null;
    carCondition: 'NEW' | 'USED' | null;
    carOdometer: number | null;
    carRegNo: string | null;
    carPrice: number | null;
    carDealer: string | null;
    carInsurance: boolean;
    carAge: number | null;

    // ── Kinh doanh
    bizName: string | null;
    bizType: string | null;
    bizYears: number | null;
    bizEmployees: number | null;
    bizProducts: string | null;
    bizMarket: string | null;
    months: Partial<MonthRow>[];
    totalRevenue: number | null;
    totalCogs: number | null;
    totalOpex: number | null;
    totalNet: number | null;
    avgMargin: number | null;
    avgMonthlyNet: number | null;
    dscr: number | null;

    // ── Tài sản bảo đảm
    collateralCount: number | null;
    totalCollateral: number | null;
    totalEligible: number | null;
    coverage: number | null;

    // ── Thu nhập, chi phí
    memberCount: number | null;
    totalIncome: number | null;
    totalExpense: number | null;
    surplus: number | null;
    dti: number | null;

    // ── Cân đối tài sản
    totalAssets: number | null;
    totalLiabilities: number | null;
    equity: number | null;
    leverage: number | null;

    // ── Chấm điểm, hồ sơ, thẩm định
    scoreCoverage: number | null;
    scoreDti: number | null;
    scoreTotal: number | null;
    rating: Rating | null;
    exceptionReason: string | null;
    docProgress: number | null;
    opinion: string | null;
    recommendAmount: number | null;
    recommendTerm: number | null;
    decision: 'APPROVE' | 'CONDITIONAL' | 'REJECT' | null;
    conditions: string | null;
    rejectReason: string | null;
  };

export const MONTH_ROWS: Partial<MonthRow>[] = Array.from({ length: 12 }, (_, i) => ({
  month: i + 1,
  label: `Tháng ${i + 1}`,
}));
