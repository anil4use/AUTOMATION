import axios from 'axios';

export async function getWooCommerceChoices(
  fieldId: string,
  credentials: Record<string, any>
): Promise<Array<{ label: string; value: string }>> {
  const storeUrl = credentials.storeUrl;
  const consumerKey = credentials.consumerKey || credentials.apiKey;
  const consumerSecret = credentials.consumerSecret || credentials.apiSecret;

  if (!storeUrl || !consumerKey || !consumerSecret) return [];

  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
  const headers = { Authorization: `Basic ${auth}` };

  try {
    if (fieldId === 'productId') {
      const res = await axios.get(`${storeUrl.replace(/\/$/, '')}/wp-json/wc/v3/products`, { headers });
      const products = res.data || [];
      return products.map((p: any) => ({ label: p.name || `${p.id}`, value: `${p.id}` }));
    }
  } catch (err) {
    return [];
  }

  return [];
}
