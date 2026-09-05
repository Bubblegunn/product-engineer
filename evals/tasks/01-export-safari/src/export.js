// Export the bookings table as a CSV file.
export async function exportBookings(rows) {
  const csv = rows.map((r) => [r.id, r.guest, r.checkIn].join(",")).join("\n");
  // Uses the File System Access API to let the user pick where to save.
  const handle = await window.showSaveFilePicker({ suggestedName: "bookings.csv" });
  const writable = await handle.createWritable();
  await writable.write(csv);
  await writable.close();
}
