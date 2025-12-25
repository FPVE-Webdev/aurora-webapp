/**
 * Deterministic Random Generator
 *
 * Provides seeded pseudo-random functions for consistent data generation.
 * Same seed always produces the same sequence of numbers.
 */

/**
 * Deterministic pseudo-random generator using sine function
 * @param seed - Numeric seed value
 * @returns Random number between 0 and 1
 */
export function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Generate a unique seed from a date object
 * Same hour on the same day produces the same seed
 * @param date - Date to generate seed from
 * @returns Numeric seed value
 */
export function timeSeed(date: Date): number {
  // Calculate day of year (1-366)
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

  const hourOfDay = date.getHours();

  // Combine day of year (0-366) * 100 + hour (0-23)
  // This ensures each hour has a unique seed per year
  return dayOfYear * 100 + hourOfDay;
}

/**
 * Generate a seed from date and an additional offset
 * Useful for generating multiple different random sequences from the same time
 * @param date - Date to generate seed from
 * @param offset - Additional offset to vary the seed
 * @returns Numeric seed value
 */
export function timeSeedWithOffset(date: Date, offset: number): number {
  return timeSeed(date) + offset;
}
