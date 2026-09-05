export function price(base, date, guest) {
  let p = base;
  const day = new Date(date).getUTCDay();
  if (day === 5 || day === 6) p = p * 1.2;
  if (guest.loyalty === "gold") p = p * 0.9;
  if (guest.loyalty === "silver") p = p * 0.95;
  const month = new Date(date).getUTCMonth();
  if (month >= 5 && month <= 7) p = p * 1.3;
  if (guest.nights >= 7) p = p * 0.85;
  return Math.round(p * 100) / 100;
}
