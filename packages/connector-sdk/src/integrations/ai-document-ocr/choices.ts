export async function getAIDocumentOCRChoices(
  fieldId: string,
  _credentials: Record<string, any>
): Promise<Array<{ label: string; value: string }>> {
  if (fieldId === 'documentType') {
    return [
      { label: 'Invoice / Billing Document', value: 'invoice' },
      { label: 'Receipt / Payment Proof', value: 'receipt' },
      { label: 'Form / ID Card Document', value: 'form' },
      { label: 'Generic PDF Table OCR', value: 'table' },
    ];
  }
  return [];
}
