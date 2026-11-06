import { Permission } from '../../core/app.store';
import { defineWorkflow, WorkflowEvent } from '../../shared/workflow';
import { FileRef } from '../../shared/dynamic-form';

export type LoanStatus = 'DRAFT' | 'SUBMITTED' | 'RETURNED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type LoanAction = 'submit' | 'approve' | 'return' | 'reject' | 'cancel';

/**
 * Quy trình hồ sơ vay — khai báo MỘT LẦN, dùng cho: tag trạng thái trên bảng, nút thao tác,
 * khoá form theo trạng thái, kiểm tra chuyển trạng thái ở mock backend.
 *
 *   Nháp ──Gửi duyệt──▶ Chờ duyệt ──Duyệt──▶ Đã duyệt
 *    │  ▲                 │  │
 *    │  └──Trả lại (bổ sung)┘  └──Từ chối──▶ Từ chối
 *    └──Huỷ──▶ Đã huỷ   (Trả lại: chuyên viên sửa rồi gửi duyệt lại)
 */
export const LOAN_WORKFLOW = defineWorkflow<LoanStatus, LoanAction, Permission>({
  states: {
    DRAFT: { label: 'Nháp', severity: 'secondary', editable: true },
    SUBMITTED: { label: 'Chờ duyệt', severity: 'info' },
    RETURNED: { label: 'Trả lại bổ sung', severity: 'warn', editable: true },
    APPROVED: { label: 'Đã duyệt', severity: 'success' },
    REJECTED: { label: 'Từ chối', severity: 'danger' },
    CANCELLED: { label: 'Đã huỷ', severity: 'contrast' },
  },
  actions: {
    submit: {
      label: 'Gửi duyệt',
      icon: 'pi pi-send',
      from: ['DRAFT', 'RETURNED'],
      to: 'SUBMITTED',
      permission: 'loan.edit',
      requiresValidForm: true,
      comment: 'optional',
    },
    cancel: {
      label: 'Huỷ hồ sơ',
      icon: 'pi pi-ban',
      severity: 'secondary',
      from: ['DRAFT', 'RETURNED'],
      to: 'CANCELLED',
      permission: 'loan.edit',
      confirm: 'Hồ sơ đã huỷ không thể khôi phục.',
      comment: 'optional',
    },
    return: {
      label: 'Trả lại bổ sung',
      icon: 'pi pi-replay',
      severity: 'warn',
      from: ['SUBMITTED'],
      to: 'RETURNED',
      permission: 'loan.approve',
      comment: 'required',
    },
    reject: {
      label: 'Từ chối',
      icon: 'pi pi-times',
      severity: 'danger',
      from: ['SUBMITTED'],
      to: 'REJECTED',
      permission: 'loan.approve',
      comment: 'required',
      confirm: 'Từ chối là quyết định cuối cùng với hồ sơ này.',
    },
    approve: {
      label: 'Duyệt',
      icon: 'pi pi-check',
      severity: 'success',
      from: ['SUBMITTED'],
      to: 'APPROVED',
      permission: 'loan.approve',
      comment: 'optional',
    },
  },
});

export const COLLATERAL_TYPES = [
  { value: 'LAND', label: 'Quyền sử dụng đất' },
  { value: 'HOUSE', label: 'Nhà ở / căn hộ' },
  { value: 'CAR', label: 'Ô tô' },
  { value: 'DEPOSIT', label: 'Sổ tiết kiệm' },
];

/** Dữ liệu kèm theo gói vay (option.data của select Gói vay). */
export interface LoanPackage {
  rate: number;
  maxTermMonths: number;
  maxAmount: number;
}

/** DTO hồ sơ vay (model phẳng — các bước của wizard không có key). */
export interface LoanApplication {
  id?: string | null;
  code?: string | null;
  status?: LoanStatus | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  history?: WorkflowEvent[];

  // ── Bước 1: Khách hàng
  customerId: string | null;
  /** Ảnh chụp thông tin khách hàng tại thời điểm lập hồ sơ (tự điền khi chọn khách hàng). */
  customerName: string | null;
  customerCode: string | null;
  customerPhone: string | null;
  hasCoBorrower: boolean;
  coBorrowerName: string | null;
  coBorrowerIdNo: string | null;
  coBorrowerRelation: string | null;
  monthlyIncome: number | null;
  monthlyDebt: number | null;

  // ── Bước 2: Khoản vay
  categoryId: string | null;
  productId: string | null;
  packageId: string | null;
  /** Tự điền theo gói vay. */
  rate: number | null;
  maxTermMonths: number | null;
  maxAmount: number | null;
  amount: number | null;
  termMonths: number | null;
  purpose: string | null;
  disburseDate: Date | null;
  installment: number | null;
  dti: number | null;
  hasCollateral: boolean;
  collateralType: string | null;
  collateralValue: number | null;
  ltv: number | null;
  collateralProvinceId: string | null;
  collateralWardId: string | null;
  collateralAddress: string | null;

  // ── Bước 3: Hồ sơ đính kèm
  idDocs: FileRef[] | null;
  incomeDocs: FileRef[] | null;
  collateralDocs: FileRef[] | null;
  otherDocs: FileRef[] | null;
  note: string | null;
}

/** Một dòng trên danh sách hồ sơ. */
export interface LoanRow {
  id: string;
  code: string;
  customerName: string;
  productName: string;
  amount: number;
  termMonths: number;
  status: LoanStatus;
  updatedAt: Date;
}

export interface LoanFilter {
  [key: string]: string | null;
  q: string | null;
  status: string | null;
  categoryId: string | null;
}

export const EMPTY_LOAN_FILTER: LoanFilter = { q: null, status: null, categoryId: null };
