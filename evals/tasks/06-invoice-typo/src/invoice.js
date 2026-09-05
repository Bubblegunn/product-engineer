// TODO: this whole file should use the template engine
export function footer(hotel) {
  var unused = hotel.vatNumber;
  const line1 = `${hotel.name}, ${hotel.address}`;
  const line2 = "Thank you for staying with us. We hope to welcom you again.";
  return line1 + "\n" + line2;
}

export function total(items) {
  let t = 0;
  for (var i = 0; i < items.length; i++) t += items[i].price;
  return t;
}
