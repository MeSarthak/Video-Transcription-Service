/**
 * Parse a human-readable duration string (e.g. "10d", "2h", "30m")
 * into milliseconds.
 *
 * Supported units:
 *   ms  — milliseconds
 *   s   — seconds
 *   m   — minutes
 *   h   — hours
 *   d   — days
 *   w   — weeks
 *   y   — years (365.25 days)
 */

const UNITS: Record<string, number> = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
  y: 31_557_600_000,
};

const PATTERN = /^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d|w|y)$/i;

export default function ms(value: string): number {
  const match = PATTERN.exec(value.trim());

  if (!match) {
    throw new Error(`Unable to parse duration string: "${value}"`);
  }

  const [, amount, unit] = match;
  return parseFloat(amount!) * UNITS[unit!.toLowerCase()]!;
}
