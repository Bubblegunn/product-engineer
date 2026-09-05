export const notifications = [
  { id: 1, text: "Room 12 checkout", needsPerson: true, read: false },
  { id: 2, text: "Nightly backup finished", needsPerson: false, read: false },
  { id: 3, text: "Guest asked for late checkout", needsPerson: true, read: false },
  { id: 4, text: "Invoice 88 paid", needsPerson: true, read: true },
];

export function renderBell(items) {
  return `<button class="bell">Bell</button>`;
}
