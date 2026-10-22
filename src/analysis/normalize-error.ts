export function normalizeErrorMessage(message: string): string {
  // 1. Regular expression for standard UUID v4/v1 patterns (8-4-4-4-12 hex characters)
  // 'i' flag ensures it catches uppercase or lowercase hex codes.
  const uuidRegex =
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

  // 2. Regular expression for standalone numeric identifiers.
  // Using \b boundaries avoids matching numbers inside words (e.g., "v2" or "service4").
  const numberRegex = /\b\d+\b/g;

  // Perform replacements sequentially
  return message.replace(uuidRegex, "<uuid>").replace(numberRegex, "<number>");
}
