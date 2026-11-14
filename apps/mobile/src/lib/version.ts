/** -1, 0 or 1 for two "1.2.3" versions. Missing parts count as 0. */
export function compareVersions(a: string, b: string): number {
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const difference = (left[i] || 0) - (right[i] || 0);
    if (difference !== 0) return Math.sign(difference);
  }
  return 0;
}
