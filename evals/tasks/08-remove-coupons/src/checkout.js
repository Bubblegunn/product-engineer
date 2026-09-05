export function applyCoupon(total, code) {
  if (code === "SUMMER10") return total * 0.9;
  if (code === "WELCOME") return total - 5;
  return total;
}

export function checkout(cart, code) {
  const subtotal = cart.reduce((s, i) => s + i.price, 0);
  const total = applyCoupon(subtotal, code);
  return { subtotal, total };
}
