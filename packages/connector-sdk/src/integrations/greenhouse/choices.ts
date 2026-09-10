export interface GreenhouseChoiceOption {
  label: string;
  value: string | number;
}

export function getGreenhouseDepartmentChoices(): GreenhouseChoiceOption[] {
  return [
    { label: 'Engineering', value: 101 },
    { label: 'Product Management', value: 102 },
    { label: 'Sales & Business Dev', value: 103 },
    { label: 'Customer Success', value: 104 },
    { label: 'Design & UX', value: 105 },
  ];
}

export function getGreenhouseStageChoices(): GreenhouseChoiceOption[] {
  return [
    { label: 'Application Review', value: 1 },
    { label: 'Recruiter Screen', value: 2 },
    { label: 'Technical Assessment', value: 3 },
    { label: 'Onsite / Final Interview', value: 4 },
    { label: 'Offer Extended', value: 5 },
  ];
}

export function getGreenhouseRejectionReasonChoices(): GreenhouseChoiceOption[] {
  return [
    { label: 'Skills/Experience Fit', value: 10 },
    { label: 'Salary Expectation Mismatch', value: 11 },
    { label: 'Position Filled', value: 12 },
    { label: 'Candidate Withdrew', value: 13 },
  ];
}
