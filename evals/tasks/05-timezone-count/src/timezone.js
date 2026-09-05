import customers from "../data/customers.json" with { type: "json" };

export function reminderHour(customer) {
  // 09:00 local, expressed in UTC hours
  const offset = { "Europe/Istanbul": 3, "Europe/London": 1 }[customer.timezone];
  return 9 - offset;
}

export function schedule() {
  return customers.map((c) => ({ id: c.id, hourUtc: reminderHour(c) }));
}
