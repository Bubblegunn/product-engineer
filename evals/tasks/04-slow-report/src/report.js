export function monthlyReport(bookings) {
  const days = {};
  for (const b of bookings) {
    for (let d = new Date(b.checkIn); d < new Date(b.checkOut); d.setUTCDate(d.getUTCDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      days[key] = (days[key] || 0) + 1;
    }
  }
  return days;
}
