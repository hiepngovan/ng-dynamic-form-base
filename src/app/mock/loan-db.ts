import { Customer } from '../features/customer/customer.model';
import { LoanApplication, LoanPackage, LoanStatus } from '../features/loan/loan.model';
import { WorkflowEvent } from '../shared/data';
import { FileRef, SelectOption } from '../shared/dynamic-form';

/** DỮ LIỆU GIẢ: danh mục sản phẩm vay + hồ sơ vay mẫu (chỉ dùng cho mock backend). */

export const CATEGORIES: SelectOption<string>[] = [
  { value: 'CN', label: 'Cho vay cá nhân' },
  { value: 'HKD', label: 'Hộ kinh doanh' },
  { value: 'BDS', label: 'Bất động sản' },
];

export const PRODUCTS: (SelectOption<string> & { categoryId: string })[] = [
  { categoryId: 'CN', value: 'TD', label: 'Vay tiêu dùng tín chấp' },
  { categoryId: 'CN', value: 'OTO', label: 'Vay mua ô tô' },
  { categoryId: 'HKD', value: 'VLD', label: 'Bổ sung vốn lưu động' },
  { categoryId: 'HKD', value: 'TSCD', label: 'Đầu tư tài sản cố định' },
  { categoryId: 'BDS', value: 'NHA', label: 'Vay mua nhà ở' },
  { categoryId: 'BDS', value: 'XD', label: 'Vay xây, sửa nhà' },
];

const M = 1_000_000;
const PACKAGE_TABLE: Record<string, [string, LoanPackage][]> = {
  TD: [
    ['Tiêu chuẩn', { rate: 14.5, maxTermMonths: 60, maxAmount: 300 * M }],
    ['Lương chuyển khoản', { rate: 12.9, maxTermMonths: 60, maxAmount: 500 * M }],
  ],
  OTO: [
    ['Ô tô mới', { rate: 9.5, maxTermMonths: 84, maxAmount: 2_000 * M }],
    ['Ô tô đã qua sử dụng', { rate: 11, maxTermMonths: 60, maxAmount: 1_000 * M }],
  ],
  VLD: [
    ['Hạn mức 12 tháng', { rate: 8.5, maxTermMonths: 12, maxAmount: 3_000 * M }],
    ['Món vay', { rate: 9.2, maxTermMonths: 36, maxAmount: 2_000 * M }],
  ],
  TSCD: [['Trung hạn', { rate: 10.2, maxTermMonths: 84, maxAmount: 5_000 * M }]],
  NHA: [
    ['Ưu đãi cố định 12 tháng', { rate: 6.9, maxTermMonths: 300, maxAmount: 10_000 * M }],
    ['Thả nổi', { rate: 9.8, maxTermMonths: 300, maxAmount: 10_000 * M }],
  ],
  XD: [['Tiêu chuẩn', { rate: 10.5, maxTermMonths: 180, maxAmount: 3_000 * M }]],
};

export function packagesOf(productId: string): SelectOption<string>[] {
  return (PACKAGE_TABLE[productId] ?? []).map(([name, data], i) => ({
    value: `${productId}-${i + 1}`,
    label: `${name} – ${data.rate.toLocaleString('vi-VN')}%/năm`,
    data,
  }));
}

export const productName = (id: string | null | undefined) =>
  PRODUCTS.find((p) => p.value === id)?.label ?? '';

/** Tệp mẫu: nội dung nhỏ nhúng thẳng trong URL (mở được, không cần server lưu tệp). */
const sampleFile = (id: string, name: string): FileRef => ({
  id,
  name,
  size: 180_000 + id.length * 7_000,
  type: 'text/plain',
  url: `data:text/plain;charset=utf-8,${encodeURIComponent(`Tệp mẫu: ${name}`)}`,
});

const STAFF = 'Nguyễn Minh Quân';
const MANAGER = 'Trần Thu Hà';

const STATUS_POOL: LoanStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'SUBMITTED',
  'RETURNED',
  'APPROVED',
  'APPROVED',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
];

/** Lịch sử xử lý dẫn tới trạng thái `status`. */
function historyTo(status: LoanStatus, start: Date, comment?: string): WorkflowEvent[] {
  const at = (h: number) => new Date(start.getTime() + h * 3_600_000);
  const created: WorkflowEvent = {
    at: at(0),
    by: STAFF,
    action: 'create',
    from: null,
    to: 'DRAFT',
  };
  const submitted: WorkflowEvent = {
    at: at(2),
    by: STAFF,
    action: 'submit',
    from: 'DRAFT',
    to: 'SUBMITTED',
  };
  switch (status) {
    case 'DRAFT':
      return [created];
    case 'SUBMITTED':
      return [created, submitted];
    case 'RETURNED':
      return [
        created,
        submitted,
        {
          at: at(26),
          by: MANAGER,
          action: 'return',
          from: 'SUBMITTED',
          to: 'RETURNED',
          comment: comment ?? 'Bổ sung sao kê lương 6 tháng gần nhất (hiện mới có 3 tháng).',
        },
      ];
    case 'APPROVED':
      return [
        created,
        submitted,
        { at: at(30), by: MANAGER, action: 'approve', from: 'SUBMITTED', to: 'APPROVED' },
      ];
    case 'REJECTED':
      return [
        created,
        submitted,
        {
          at: at(30),
          by: MANAGER,
          action: 'reject',
          from: 'SUBMITTED',
          to: 'REJECTED',
          comment: 'DTI vượt ngưỡng, khách hàng có nợ nhóm 2 trên CIC.',
        },
      ];
    case 'CANCELLED':
      return [
        created,
        {
          at: at(5),
          by: STAFF,
          action: 'cancel',
          from: 'DRAFT',
          to: 'CANCELLED',
          comment: 'Khách hàng không vay nữa',
        },
      ];
  }
}

/** Hồ sơ đầy đủ (đủ điều kiện gửi duyệt) cho một khách hàng. */
function fullLoan(c: Customer, i: number, status: LoanStatus, start: Date): LoanApplication {
  const product = PRODUCTS[i % PRODUCTS.length];
  const pkg = packagesOf(product.value)[0];
  const data = pkg.data as LoanPackage;
  const amount = Math.min(data.maxAmount, (5 + (i % 20) * 15) * M);
  const term = Math.min(data.maxTermMonths, 12 * (1 + (i % 5)));
  const collateral = product.categoryId !== 'CN' || product.value === 'OTO';
  return {
    id: `L${i}`,
    code: `HS${String(260000 + i).padStart(6, '0')}`,
    status,
    createdAt: start,
    updatedAt: new Date(start.getTime() + 30 * 3_600_000),
    history: historyTo(status, start),
    customerId: c.id!,
    customerName: c.fullName,
    customerCode: c.code,
    customerPhone: c.phone,
    hasCoBorrower: false,
    coBorrowerName: null,
    coBorrowerIdNo: null,
    coBorrowerRelation: null,
    monthlyIncome: (20 + (i % 6) * 10) * M,
    monthlyDebt: (i % 3) * 2 * M,
    categoryId: product.categoryId,
    productId: product.value,
    packageId: pkg.value,
    rate: data.rate,
    maxAmount: data.maxAmount,
    maxTermMonths: data.maxTermMonths,
    amount,
    termMonths: term,
    purpose: `Sử dụng vốn cho mục đích: ${product.label.toLowerCase()}`,
    disburseDate: new Date(2026, 11, 1 + (i % 28)),
    installment: null,
    dti: null,
    hasCollateral: collateral,
    collateralType: collateral ? (product.value === 'OTO' ? 'CAR' : 'HOUSE') : null,
    collateralValue: collateral ? amount * 2 : null,
    ltv: null,
    collateralProvinceId: collateral && product.value !== 'OTO' ? 'HN' : null,
    collateralWardId: collateral && product.value !== 'OTO' ? 'HN-W03' : null,
    collateralAddress: collateral && product.value !== 'OTO' ? `${10 + i} Phố Huế` : null,
    idDocs: [sampleFile(`f${i}a`, 'cccd-mat-truoc.jpg'), sampleFile(`f${i}b`, 'cccd-mat-sau.jpg')],
    incomeDocs: [sampleFile(`f${i}c`, 'sao-ke-luong-3-thang.pdf')],
    collateralDocs: collateral ? [sampleFile(`f${i}d`, 'giay-chung-nhan-qsdd.pdf')] : null,
    otherDocs: null,
    note: null,
  };
}

/**
 * L1: Trả lại bổ sung (chuyên viên mở để sửa, gửi duyệt lại).
 * L2: Chờ duyệt (trưởng phòng mở để duyệt / trả lại / từ chối).
 * Còn lại: trạng thái ngẫu nhiên nhưng cố định.
 */
export function seedLoans(customers: Customer[], count = 58): LoanApplication[] {
  return Array.from({ length: count }, (_, k) => {
    const i = k + 1;
    const status: LoanStatus =
      i === 1 ? 'RETURNED' : i === 2 ? 'SUBMITTED' : STATUS_POOL[(i * 7) % STATUS_POOL.length];
    const start = new Date(2026, 9, 1 + (i % 30), 9, 0);
    return fullLoan(customers[(i - 1) % customers.length], i, status, start);
  }).sort((a, b) => b.updatedAt!.getTime() - a.updatedAt!.getTime());
}
