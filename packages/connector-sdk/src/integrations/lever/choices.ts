export interface LeverChoiceOption {
  label: string;
  value: string;
}

export function getLeverStageChoices(): LeverChoiceOption[] {
  return [
    { label: 'New Lead', value: 'lead-new' },
    { label: 'Reached Out', value: 'lead-reached-out' },
    { label: 'Phone Screen', value: 'phone-screen' },
    { label: 'Onsite Interview', value: 'onsite-interview' },
    { label: 'Offer', value: 'offer' },
  ];
}

export function getLeverArchiveReasonChoices(): LeverChoiceOption[] {
  return [
    { label: 'Hired', value: 'hired' },
    { label: 'Underqualified', value: 'underqualified' },
    { label: 'Timing', value: 'timing' },
    { label: 'Withdrew', value: 'withdrew' },
    { label: 'Compensation', value: 'compensation' },
  ];
}
