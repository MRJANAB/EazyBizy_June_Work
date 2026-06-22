const ones = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ones[n];
  const t = tens[Math.floor(n / 10)];
  const o = ones[n % 10];
  return o ? `${t} ${o}` : t;
}

function threeDigits(n: number): string {
  if (n === 0) return "";
  if (n < 100) return twoDigits(n);
  const h = ones[Math.floor(n / 100)];
  const rest = twoDigits(n % 100);
  return rest ? `${h} Hundred ${rest}` : `${h} Hundred`;
}

export function numberToWords(n: number): string {
  if (!n || n === 0) return "";
  n = Math.floor(Math.abs(n));

  const parts: string[] = [];

  if (n >= 1_00_00_000) {
    const crore = Math.floor(n / 1_00_00_000);
    parts.push(`${threeDigits(crore)} Crore`);
    n %= 1_00_00_000;
  }
  if (n >= 1_00_000) {
    const lakh = Math.floor(n / 1_00_000);
    parts.push(`${twoDigits(lakh)} Lakh`);
    n %= 1_00_000;
  }
  if (n >= 1_000) {
    const thousand = Math.floor(n / 1_000);
    parts.push(`${twoDigits(thousand)} Thousand`);
    n %= 1_000;
  }
  if (n > 0) {
    parts.push(threeDigits(n));
  }

  return parts.filter(Boolean).join(" ");
}
