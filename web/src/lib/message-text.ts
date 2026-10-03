/** Visible text for a message. WhatsApp templates often arrive with an empty Body. */
export function messageText(msg: {
  body?: string | null;
  content_sid?: string | null;
  content_variables?: string | null;
  media_url?: string | null;
}): string {
  const body = (msg.body || '').trim();
  if (body) return body;

  const variables = contentVariableLines(msg.content_variables);
  if (variables) return variables;

  const media = (msg.media_url || '').trim();
  if (media) return media;

  const sid = (msg.content_sid || '').trim();
  if (sid) return `Template ${sid}`;

  return '';
}

function contentVariableLines(raw?: string | null): string {
  const text = (raw || '').trim();
  if (!text) return '';

  const parsed = parseVariables(text);
  if (!parsed) return text;

  return Object.keys(parsed)
    .sort((a, b) => {
      const an = Number(a);
      const bn = Number(b);
      if (Number.isFinite(an) && Number.isFinite(bn) && an !== bn) return an - bn;
      return a.localeCompare(b);
    })
    .map((key) => String(parsed[key] ?? '').trim())
    .filter(Boolean)
    .join('\n');
}

function parseVariables(text: string): Record<string, unknown> | null {
  try {
    const value = JSON.parse(text) as unknown;
    if (typeof value === 'string') return parseVariables(value);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  } catch {
    return null;
  }
  return null;
}
