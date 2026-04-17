// Input sanitization utilities to prevent injection attacks
// and normalize user input before storage

export function sanitizeString(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

export function sanitizePhoneNumber(input: string): string {
  // Remove all non-digit and non-plus characters
  return input.replace(/[^\d+]/g, '');
}

export function sanitizeAddress(input: string): string {
  // Trim and normalize whitespace, but keep newlines if any
  return input.trim().replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n');
}
