export type ModerationDecision = "ALLOW" | "QUARANTINE" | "REJECT" | "BAN";
export interface ModerationResult { decision: ModerationDecision; category: string; reason: string; score: number; }

const sexualExploitation = ["ልጅ ወሲብ", "የህጻናት ወሲብ", "child sex", "child sexual", "minor sex", "child porn", "cp", "የልጆች ወሲብ", "የወሲብ ብዝበዛ"];
const intimateNonConsent = ["revenge porn", "non consensual nude", "non-consensual nude", "nonconsensual nude", "ያለፈቃድ እርቃን", "ያለፈቃድ የወሲብ", "የግል ምስል አሰራጭ"];
const scams = ["send money", "pay first", "double your money", "guaranteed profit", "ብር ላክ", "ገንዘብ ላክ", "ገንዘብህን እጥፍ", "100% ትርፍ", "ማረጋገጫ ክፍያ", "registration fee", "investment guaranteed", "give me your otp", "send otp", "ኮድ ላክ"];
const fraud = ["fake id", "fake certificate", "counterfeit", "ሐሰተኛ መታወቂያ", "ሐሰተኛ ሰነድ", "ማጭበርበር", "ማስመሰል"];
const monitored = ["kill you", "i will kill", "እገድልሃለሁ", "እገድልሻለሁ", "threat", "ጥላቻ", "terrorist", "bomb", "ቦምብ", "እሳት አቃጥል"];
const urlPattern = /(https?:\/\/|www\.|t\.me\/|telegram\.me\/|wa\.me\/|bit\.ly\/|tinyurl\.com\/)/iu;
const zeroWidth = /[\u200B-\u200D\u2060\uFEFF]/gu;
const punctuation = /[\p{P}\p{S}\s_]+/gu;

function normalizeForSafety(input: string): string {
  return input.normalize("NFKC").replace(zeroWidth, "").toLowerCase().replace(/[\u0430\u0410]/g, "a").replace(/[\u0435\u0415]/g, "e").replace(/[\u043E\u041E]/g, "o").trim();
}
function compact(input: string): string { return normalizeForSafety(input).replace(punctuation, ""); }
function matches(list: string[], normalized: string, compacted: string): boolean { return list.some(item => normalized.includes(item) || compacted.includes(compact(item))); }

export function moderateText(text: string, options: { isAdmin: boolean; isForwarded: boolean }): ModerationResult {
  const normalized = normalizeForSafety(text);
  const compacted = compact(text);
  if (options.isForwarded) return { decision: "REJECT", category: "FORWARDED_CONTENT", reason: "Forwarded content is disabled.", score: 1 };
  if (!options.isAdmin && urlPattern.test(normalized)) return { decision: "REJECT", category: "LINK", reason: "Links are restricted to administrators.", score: 1 };
  if (matches(sexualExploitation, normalized, compacted)) return { decision: "BAN", category: "SEXUAL_EXPLOITATION", reason: "Potential sexual exploitation detected.", score: 1 };
  if (matches(intimateNonConsent, normalized, compacted)) return { decision: "BAN", category: "NON_CONSENSUAL_INTIMATE_CONTENT", reason: "Potential non-consensual intimate content detected.", score: 1 };
  if (matches(scams, normalized, compacted)) return { decision: "REJECT", category: "SCAM", reason: "Potential scam pattern detected.", score: 1 };
  if (matches(fraud, normalized, compacted)) return { decision: "REJECT", category: "FRAUD", reason: "Potential fraud pattern detected.", score: 1 };
  if (matches(monitored, normalized, compacted)) return { decision: "ALLOW", category: "MONITORED_SAFETY_CATEGORY", reason: "Safety category detected; retained for monitoring.", score: 0.35 };
  return { decision: "ALLOW", category: "NONE", reason: "No blocking rule matched.", score: 0 };
}
