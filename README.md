# ng-dynamic-form-base

Base project Angular cho **form sinh từ cấu hình** (dynamic form): khai báo field, kiểu dữ liệu,
validation, onChange… và form tự render. Mục tiêu: đồng bộ UI giữa các dev, giảm bug, làm form nhanh.

| Thành phần | Phiên bản | Ghi chú |
|---|---|---|
| Angular | 21.2 (standalone, zoneless) | |
| @ngx-formly/core | 10.0 | Engine form. Lên Angular 22 thì dùng Formly 11 |
| PrimeNG | 21.1 (MIT) + @primeuix/themes 2 | **PrimeNG 22 đổi sang giấy phép thương mại**, xem mục cuối |
| Node | 24.22 (`.nvmrc`) | Angular 21 cần Node ≥ 20.19 |

## Chạy

```bash
nvm use            # Node theo .nvmrc
npm install
npm start          # http://localhost:4200 — form mẫu "Hồ sơ khách hàng" (465 field, 6 tab)
npm test           # unit test cấu hình form (vitest, không render UI)
npm run build
```

Trên trang mẫu: **Lưu khách hàng** khi form trống (xem badge lỗi trên tab), **Nạp dữ liệu mẫu**,
**Chế độ xem**, nhập SĐT `0900000000` rồi lưu để thử lỗi từ server.

Tab **Phương án vay** (322 field) là bài thử tải: ẩn/hiện theo mục đích vay, nhóm lặp cố định
(5 tài sản bảo đảm, 4 người có thu nhập), bảng 12 tháng có cột tính, 70 field tính toán phụ thuộc
chéo giữa các section (trả nợ hằng kỳ → DSCR, DTI, thặng dư, chấm điểm, xếp hạng).

## Cấu trúc

```
src/app/
├── shared/dynamic-form/          # BASE — chỉ người phụ trách base sửa
│   ├── index.ts                  # public API: feature chỉ import từ đây
│   ├── dynamic-form.config.ts    # ĐĂNG KÝ tập trung type / wrapper / validator / message
│   ├── builder/field-builder.ts  # fieldsFor<T>(): bộ hàm khai báo field (kiểm tra key khi compile)
│   ├── form/app-form.component.ts# <app-form>: submit, focus field lỗi, lỗi server, chế độ xem
│   ├── types/                    # input, textarea, number/money, date, select, radio, checkbox,
│   │                             # tabs (lazy + render theo lô), table (bảng lặp), component (lối thoát)
│   ├── wrappers/                 # form-field (label, *, tooltip, lỗi), cell (ô bảng), section
│   ├── validation/               # validator dùng chung (vnPhone, cccd, taxCode, email, lte, dateAfter) + message
│   ├── guards/                   # cảnh báo rời trang khi chưa lưu
│   └── testing/build-test-form.ts# dựng form không render để unit test
└── features/customer/            # VÍ DỤ màn hình nghiệp vụ
    ├── form/customer.form.ts     # chỉ ghép các tab
    ├── form/tab-*.ts             # mỗi tab một file
    ├── form/plan/                # tab lớn tách theo section; plan.calc.ts = công thức (hàm thuần)
    ├── form/customer.form.spec.ts
    └── customer-edit.page.ts     # màn hình: cấu hình + xử lý lưu, không có template form viết tay
```

## Viết một form

```ts
const f = fieldsFor<Customer>();          // key sai tên → lỗi compile

f.section('Liên hệ', [
  f.phone('phone', 'Điện thoại', { required: true }),          // đã kèm validator vnPhone
  f.email('email', 'Email', { requiredIf: (m) => !!m.vatRegistered }),
  f.select('provinceId', 'Tỉnh/TP', { options: md.provinces(), resets: ['wardId'] }),
  f.select('wardId', 'Phường/Xã', { dependsOn: 'provinceId', loadOptions: (id) => md.wards(id) }),
  f.money('deposit', 'Đặt cọc', {
    validators: [{ name: 'lte', options: { field: 'creditLimit', label: 'Hạn mức' } }],
  }),
  f.text('bankAccountName', 'Chủ tài khoản', {
    onChange: ({ value, set }) => set('bankAccountName', String(value ?? '').toUpperCase()),
  }),
], { hideIf: (m) => m.customerType !== 'COMPANY' });
```

```html
<app-form [fields]="fields" [model]="model" (submitted)="save($event)" />
```

Tuỳ chọn chung của mọi field: `col` (1–12, mặc định 4), `required`, `requiredIf`, `hideIf`,
`disabledIf`, `validators`, `check` (quy tắc riêng của field), `messages` (đổi message cho field
này), `readonly`, `resets`, `revalidates`, `onChange`, `tooltip`, `description`,
`extra` (lối thoát: cấu hình Formly gốc).

```ts
// Field tính toán: tự tính lại khi model đổi, ghi vào cả model lẫn control (có trong dữ liệu submit),
// gắn được validator; lỗi hiện ngay không chờ submit.
f.calc('dscr', 'Hệ số trả nợ', calc.dscr, {
  format: 'number',                 // money (mặc định) | number | percent | date | text
  min: 1.2,
  messages: { min: 'DSCR phải từ 1,2 trở lên' },
}),

// Quy tắc riêng, không cần đăng ký validator dùng chung
f.number('graceMonths', 'Số tháng ân hạn', {
  check: { test: (v, m) => v < (m.termMonths ?? 0), message: 'Ân hạn phải nhỏ hơn thời hạn vay' },
}),

// Bảng cố định số dòng (không có nút thêm/xoá)
f.table<MonthRow>('months', (c) => [c.money('revenue', 'Doanh thu'), c.calc('net', 'Lợi nhuận', calc.net)],
  { fixedRows: MONTH_ROWS }),
```

## Quy tắc cho team

1. Mọi form nhập liệu dùng `<app-form>` + `fieldsFor<T>()`. Không viết `<input>` tay trong feature.
2. Tạo cấu hình **một lần** (thuộc tính class), không gọi hàm build trong template.
3. Mỗi tab một file `tab-*.ts`. File cấu hình nhận service qua tham số, không tự inject.
4. Cần type / prop / validator mới → thêm vào `shared/dynamic-form` và nhờ người phụ trách base review.
   Khối UI quá đặc thù → `f.component(MyComponent)`.
5. Message lỗi dùng chung nằm ở `validation/messages.ts`, không viết lại trong feature.
6. Viết unit test cho cấu hình form bằng `buildTestForm` (xem `customer.form.spec.ts`).
7. Công thức tính viết thành **hàm thuần** trong `*.calc.ts`, có unit test riêng (xem `plan.calc.spec.ts`).
   Hàm tính từ field nhập, không đọc kết quả của field calc khác (thứ tự tính không được đảm bảo);
   cần kết quả trung gian thì gọi lại hàm (`dscr` gọi `installment`).
8. Nhóm lặp cố định (tài sản 1..5) dùng key phẳng có đánh số + section `hideIf: m => m.count < i`;
   danh sách người dùng tự thêm dòng thì dùng `f.table`.

### Logic liên quan nhiều tab

| Loại logic | Đặt ở đâu | Lý do |
|---|---|---|
| Reset / gán giá trị khi người dùng đổi | `resets` / `onChange` của **field nguồn** | Chỉ chạy khi người dùng thao tác, không chạy khi nạp dữ liệu sửa |
| Ẩn/hiện, required, disabled theo điều kiện | `hideIf` / `requiredIf` / `disabledIf` | Formly tính ở cấp form, không phụ thuộc field có đang render hay không |
| Tải options theo field cha | `dependsOn` + `loadOptions` của **field đích** | Chỉ gọi API khi field hiển thị |
| So sánh chéo | validator `lte` / `dateAfter` + `revalidates` ở field kia | |

## Những điều đã kiểm chứng trong mã nguồn Formly (quan trọng)

- **Control của mọi field được tạo khi dựng form**, không phụ thuộc render → tab chưa mở vẫn được
  validate. Vì vậy tab dùng `@if` (type `tabs`), **không dùng `hide`**: `hide` gỡ control khỏi
  form và xoá giá trị.
- **`hooks` (onInit…) chỉ chạy khi field được render** → không đặt logic liên tab trong hooks.
- **Formly chỉ đồng bộ control → model cho field đang render.** Builder (`resets`, `set()` trong
  `onChange`) luôn gán cả control lẫn model; `<app-form>` emit `form.getRawValue()` làm dữ liệu chuẩn.
- **Field tính dùng `expressions['model.<key>']` có sẵn của Formly**: gán model + `patchValue` control.
  Mọi expressions của form được tính lại mỗi lần model đổi (~550 field: vài ms, không đáng kể).
- **Tab có key (vd `plan`) có thể chưa có object model ngay sau khi reset form** → builder luôn truyền
  `{}` thay cho `undefined` vào `hideIf` / `requiredIf` / `calc`… (lỗi này đã gặp khi bấm "Thêm mới").

## Hiệu năng (build production, Chromium headless trên Mac Apple Silicon)

Form mẫu 465 field / 6 tab. Đo bằng Event Timing API (thao tác → lần vẽ kế tiếp, cách Chrome tính INP).

| Thao tác | Kết quả |
|---|---|
| Dựng form lần đầu (render tab 1) | ~60–85 ms |
| Mở tab Phương án vay (dữ liệu mẫu, ~280 field hiển thị) → lần vẽ đầu | ~40 ms |
| … render xong toàn bộ tab (theo lô, không có frame nào > 50 ms) | ~360 ms |
| Gõ vào ô Doanh thu tháng 1 (kéo theo ~20 field tính) | ≤ 32 ms |
| Đổi mục đích vay SXKD → BĐS (ẩn ~95 field, hiện 14) | ~90 ms |
| Số tài sản bảo đảm 2 → 5 (hiện thêm 27 field) | ~50 ms |
| Bấm Lưu khi có lỗi (chuyển tab, focus field lỗi) | ~32 ms |
| Mở tab 90 field / select 200 lựa chọn | ~40 ms |

- Field thường tốn < 0,5 ms để render. **`p-datepicker` tốn ~7 ms mỗi cái** → type `date` chỉ hiện ô
  nhập nhẹ, tạo `p-datepicker` khi người dùng focus vào ô (hoặc form focus vào ô lỗi). Trước khi
  sửa: section 19 ô ngày mất 156 ms trong một frame; tab 90 field mất ~112 ms để mở.
- Type `tabs` render mỗi frame một section, type `table` render mỗi frame 3 dòng. Nên chia tab lớn
  thành nhiều section vừa phải (≤ ~40 field) để mỗi frame ngắn.
- Bảng sửa trực tiếp hàng trăm dòng → dùng phân trang hoặc grid chuyên dụng.

## Giấy phép PrimeNG

PrimeNG ≤ 21 dùng giấy phép MIT. **PrimeNG 22 (bản duy nhất hỗ trợ Angular 22) chuyển sang
"PrimeUI License"**: miễn phí cho tổ chức < 5 dev, < 10 nhân viên, doanh thu < 1 triệu USD/năm;
ngoài ra phải mua license theo dev và cấu hình license key. Khi nâng lên Angular 22 cần quyết định:
mua license PrimeNG, hoặc đổi thư viện UI (chỉ phải viết lại `types/` và `wrappers/`, form nghiệp
vụ giữ nguyên nhờ lớp builder).
