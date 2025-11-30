export const sha256Hex = async (value: string): Promise<string> => {
  const enc = new TextEncoder();
  const data = enc.encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
};

