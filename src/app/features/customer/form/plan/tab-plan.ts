import { FormlyFieldConfig } from '@ngx-formly/core';
import { FieldBuilder, fieldsFor } from '../../../../shared/dynamic-form';
import { MasterDataService } from '../../master-data.service';
import { appraisalSections } from './plan-appraisal';
import { businessSections } from './plan-business';
import { collateralSections } from './plan-collateral';
import { householdSections } from './plan-household';
import { loanSections } from './plan-loan';
import { LoanPlan } from './plan.model';

/**
 * Tab "Phương án vay vốn" (~320 field): ẩn/hiện theo mục đích vay, nhóm lặp cố định,
 * bảng 12 tháng có cột tính, 70 field tính toán phụ thuộc chéo giữa các section.
 * Tab CÓ key 'plan' → model.plan = { ... }; expressions bên trong nhận model = plan.
 */
export function planTab(md: MasterDataService): FormlyFieldConfig[] {
  const f: FieldBuilder<LoanPlan> = fieldsFor<LoanPlan>();
  return [
    ...loanSections(f, md),
    ...businessSections(f),
    ...collateralSections(f),
    ...householdSections(f),
    ...appraisalSections(f),
  ];
}
