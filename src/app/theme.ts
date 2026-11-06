import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import { Translation } from 'primeng/api';

/** Theme của hệ thống: Aura, màu chủ đạo xanh dương. Đổi màu toàn hệ thống tại đây. */
export const AppThemePreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{blue.50}',
      100: '{blue.100}',
      200: '{blue.200}',
      300: '{blue.300}',
      400: '{blue.400}',
      500: '{blue.500}',
      600: '{blue.600}',
      700: '{blue.700}',
      800: '{blue.800}',
      900: '{blue.900}',
      950: '{blue.950}',
    },
  },
});

/** Bản dịch tiếng Việt cho component PrimeNG (datepicker, select, ...). */
export const PRIMENG_VI: Translation = {
  dayNames: ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'],
  dayNamesShort: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
  dayNamesMin: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
  monthNames: [
    'Tháng 1',
    'Tháng 2',
    'Tháng 3',
    'Tháng 4',
    'Tháng 5',
    'Tháng 6',
    'Tháng 7',
    'Tháng 8',
    'Tháng 9',
    'Tháng 10',
    'Tháng 11',
    'Tháng 12',
  ],
  monthNamesShort: [
    'Th1',
    'Th2',
    'Th3',
    'Th4',
    'Th5',
    'Th6',
    'Th7',
    'Th8',
    'Th9',
    'Th10',
    'Th11',
    'Th12',
  ],
  firstDayOfWeek: 1,
  today: 'Hôm nay',
  clear: 'Xoá',
  dateFormat: 'dd/mm/yy',
  weekHeader: 'Tuần',
  emptyMessage: 'Không có dữ liệu',
  emptyFilterMessage: 'Không tìm thấy',
  emptySearchMessage: 'Không tìm thấy',
  choose: 'Chọn',
  cancel: 'Huỷ',
  accept: 'Đồng ý',
  reject: 'Không',
};
