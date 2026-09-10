export interface IndeedChoiceOption {
  label: string;
  value: string;
}

export function getIndeedJobTypeChoices(): IndeedChoiceOption[] {
  return [
    { label: 'Full-time', value: 'fulltime' },
    { label: 'Part-time', value: 'parttime' },
    { label: 'Contract', value: 'contract' },
    { label: 'Temporary', value: 'temporary' },
    { label: 'Internship', value: 'internship' },
  ];
}

export function getIndeedApplicationStatusChoices(): IndeedChoiceOption[] {
  return [
    { label: 'New Applicants', value: 'new' },
    { label: 'Reviewed', value: 'reviewed' },
    { label: 'Contacted', value: 'contacted' },
    { label: 'Hired', value: 'hired' },
    { label: 'Rejected', value: 'rejected' },
  ];
}
