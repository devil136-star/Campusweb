const ALLOWED_EXACT_DOMAINS = new Set(["gmail.com"]);

const ACADEMIC_DOMAIN_PATTERNS = [
  /\.edu$/i,
  /\.edu\./i,
  /\.ac\.in$/i,
  /\.in\.ac$/i,
  /\.ac\.uk$/i,
  /\.edu\.in$/i,
  /\.edu\.au$/i,
  /\.ac\.jp$/i,
  /\.ac\.nz$/i,
  /\.edu\.sg$/i,
  /\.edu\.pk$/i,
  /\.edu\.bd$/i,
  /\.edu\.np$/i,
  /\.ac\.za$/i,
  /\.edu\.mx$/i,
  /\.edu\.br$/i,
  /\.edu\.cn$/i,
  /\.ac\.kr$/i,
  /\.edu\.ph$/i,
  /\.edu\.my$/i,
  /\.ac\.id$/i,
  /\.edu\.tw$/i,
  /\.ac\.th$/i,
  /\.ac\.at$/i,
  /\.ac\.be$/i,
  /\.edu\.pl$/i,
  /\.edu\.tr$/i,
  /\.edu\.eg$/i,
  /\.edu\.sa$/i,
  /\.edu\.ae$/i,
];

export function isAllowedCampusEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const atIndex = normalized.lastIndexOf("@");
  if (atIndex <= 0) return false;

  const domain = normalized.slice(atIndex + 1);
  if (!domain || domain.includes(" ")) return false;

  if (ALLOWED_EXACT_DOMAINS.has(domain)) return true;

  return ACADEMIC_DOMAIN_PATTERNS.some((pattern) => pattern.test(domain));
}

export function getEmailValidationError(email: string): string | null {
  if (!isAllowedCampusEmail(email)) {
    return "Use a university email (.edu, .ac.in, .in.ac, etc.) or Gmail";
  }
  return null;
}
