export type CustomerType = 'PERSONAL' | 'COMPANY';

export interface Contact {
  fullName: string | null;
  position: string | null;
  phone: string | null;
  email: string | null;
  isPrimary: boolean;
}

/** DTO khách hàng (model phẳng — các tab không có key, trừ `extra`). */
export interface Customer {
  // ── Tab Thông tin chung
  customerType: CustomerType | null;
  code: string | null;
  fullName: string | null;
  shortName: string | null;
  // cá nhân
  dob: Date | null;
  gender: string | null;
  identityNo: string | null;
  identityIssueDate: Date | null;
  identityExpiryDate: Date | null;
  identityIssuePlace: string | null;
  // doanh nghiệp
  taxCode: string | null;
  businessLicenseNo: string | null;
  establishedDate: Date | null;
  legalRepresentative: string | null;
  // phân loại
  industryId: string | null;
  customerGroupId: string | null;
  status: string | null;
  sourceId: string | null;
  salesStaffId: string | null;
  // liên hệ
  phone: string | null;
  phone2: string | null;
  email: string | null;
  website: string | null;
  fax: string | null;
  note: string | null;

  // ── Tab Địa chỉ
  provinceId: string | null;
  wardId: string | null;
  street: string | null;
  postalCode: string | null;
  sameAddress: boolean;
  contactProvinceId: string | null;
  contactWardId: string | null;
  contactStreet: string | null;
  deliveryTime: string | null;
  deliveryNote: string | null;

  // ── Tab Tài chính
  currency: string | null;
  creditLimit: number | null;
  deposit: number | null;
  paymentTermDays: number | null;
  discountRate: number | null;
  paymentMethod: string | null;
  bankId: string | null;
  bankBranch: string | null;
  bankAccountNo: string | null;
  bankAccountName: string | null;
  vatRegistered: boolean;
  invoiceEmail: string | null;
  invoiceAddress: string | null;

  // ── Tab Người liên hệ
  contacts: Contact[];

  // ── Tab Thông tin bổ sung (tab CÓ key → model.extra = { ... })
  extra: Record<string, unknown>;
}
