export async function notifyAccounting(payout, fetchImpl = fetch) {
  const res = await fetchImpl("https://accounting.example.com/hooks/payout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payout),
  });
  if (!res.ok) console.error("accounting webhook failed", res.status);
}
