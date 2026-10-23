// OPTIONAL live extraction. Off by default. Enabled only when VITE_USE_LIVE_AI=true and a key is present in .env.
// No key is shipped in the code. The demo's rules still run on the canned sample metadata; only the extracted
// fields are replaced by what Claude reads from the image.
import Anthropic from '@anthropic-ai/sdk';

export const LIVE_AI_ENABLED = import.meta.env.VITE_USE_LIVE_AI === 'true' && !!import.meta.env.VITE_ANTHROPIC_API_KEY;
export const LIVE_AI_MODEL = 'claude-opus-5-5';

async function imageToBase64(url: string): Promise<string> {
  const blob = await (await fetch(url)).blob();
  const buf = await blob.arrayBuffer();
  let bin = '';
  for (const b of new Uint8Array(buf)) bin += String.fromCharCode(b);
  return btoa(bin);
}

/** Reads a document image with Claude and returns flat key/value fields. Returns null on any failure so the demo falls back to canned data. */
export async function liveExtract(imageUrl: string, docType: string): Promise<Record<string, string> | null> {
  if (!LIVE_AI_ENABLED) return null;
  try {
    const client = new Anthropic({ apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY, dangerouslyAllowBrowser: true });
    const data = await imageToBase64(imageUrl);
    const response = await client.messages.create({
      model: LIVE_AI_MODEL,
      max_tokens: 2048,
      output_config: { effort: 'low' },
      system: 'You read vendor onboarding documents for a procurement team. Return only a flat JSON object of the fields visible on the document (legal name, registration numbers, tax numbers, IBAN, dates, account holder, bank). Keys in English, values exactly as printed. No prose.',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/png', data } },
            { type: 'text', text: `Document type expected: ${docType}. Extract the fields as JSON.` },
          ],
        },
      ],
    });
    if (response.stop_reason === 'refusal') return null;
    const text = response.content.filter((b) => b.type === 'text').map((b) => (b.type === 'text' ? b.text : '')).join('');
    const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) if (v !== null && typeof v !== 'object') out[k] = String(v);
    return out;
  } catch (err) {
    console.warn('Live extraction failed, falling back to canned result', err);
    return null;
  }
}
