// Mirrors backend/src/providers/sms/sms-segments.util.ts — kept as a small,
// duplicated pure formula (not worth a shared package) so the composer can
// show live character/segment counts without a round-trip per keystroke.
const GSM7_BASIC = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1BÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?" +
  "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM7_EXTENDED = "^{}\\[~]|€";

function isGsm7(text: string): boolean {
  for (const ch of text) {
    if (!GSM7_BASIC.includes(ch) && !GSM7_EXTENDED.includes(ch)) return false;
  }
  return true;
}

export function countSmsSegments(message: string): { characters: number; segments: number; encoding: "GSM-7" | "UCS-2" } {
  const characters = message.length;
  if (characters === 0) return { characters: 0, segments: 0, encoding: "GSM-7" };
  const gsm7 = isGsm7(message);
  const single = gsm7 ? 160 : 70;
  const multi = gsm7 ? 153 : 67;
  const segments = characters <= single ? 1 : Math.ceil(characters / multi);
  return { characters, segments, encoding: gsm7 ? "GSM-7" : "UCS-2" };
}
