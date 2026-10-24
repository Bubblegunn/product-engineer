// The suspicious-return detector in bin/stubs.mjs. A function whose name starts with an action verb,
// added in this change, whose body does nothing but return an empty literal is reported at warn level.
// Each case is a whole file; every line is treated as added, except where a case says otherwise.
import { test } from "node:test";
import assert from "node:assert/strict";
import { scanAdded } from "../bin/stubs.mjs";

const scan = (file, source, { only } = {}) => {
  const lines = source.split("\n");
  const added = lines.map((text, i) => ({ file, line: i + 1, text })).filter((e) => !only || only(e.line));
  return scanAdded(added, { read: () => lines });
};
const suspicious = (file, source, opts) => scan(file, source, opts).findings.filter((f) => f.code === "suspicious-return");

test("a JS function named for an action that only returns an empty literal is a warning", () => {
  const cases = [
    "export function createBooking(input) {\n  return {};\n}",
    "async function fetchUsers() {\n  return [];\n}",
    "function saveDraft(draft) {\n  return null;\n}",
    "function deleteItem(id) {\n  return undefined;\n}",
    "function sendReceipt(to) {\n  return '';\n}",
    "function loadRows() {\n  return false;\n}",
    "function exportCsv(rows) {\n  return 0;\n}",
    "const updateProfile = (profile) => {\n  return {};\n};",
    "const submitForm = (form) => null;",
    "class Mailer {\n  notify(user) {\n    return null;\n  }\n}",
  ];
  for (const source of cases) {
    const found = suspicious("src/actions.ts", source);
    assert.equal(found.length, 1, `expected one finding for: ${source}`);
    assert.equal(found[0].level, "warn");
  }
});

test("a comment alongside the return does not hide the empty return", () => {
  const found = suspicious("src/actions.ts", "function createInvoice() {\n  // not built yet\n  return {};\n}");
  assert.equal(found.length, 1);
});

test("a Python function named for an action that only returns an empty literal is a warning", () => {
  const cases = [
    "def create_invoice(data):\n    return None",
    "def fetch_rows():\n    # placeholder\n    return []",
    "def process_order(order):\n    return {}",
    "def validate_input(value):\n    return False",
    "async def publish_post(post):\n    return 0",
  ];
  for (const source of cases) {
    assert.equal(suspicious("app/service.py", source).length, 1, `expected one finding for: ${source}`);
  }
});

test("a name without an action verb first is not reported, and a verb that is only inside the name is not either", () => {
  assert.equal(suspicious("src/a.ts", "function computeTotal() {\n  return {};\n}").length, 0);
  assert.equal(suspicious("src/a.ts", "function createdAtStamp() {\n  return null;\n}").length, 0);
  assert.equal(suspicious("src/a.ts", "function getCreate() {\n  return null;\n}").length, 0);
});

test("the first token of a snake or camel name is the verb that counts", () => {
  assert.equal(suspicious("src/a.ts", "function handle_event() {\n  return null;\n}").length, 1);
  assert.equal(suspicious("src/a.ts", "function saveAs() {\n  return null;\n}").length, 1);
});

test("a body that does more than return an empty literal is not reported", () => {
  assert.equal(suspicious("src/a.ts", "function createBooking(input) {\n  return { id: input.id };\n}").length, 0);
  assert.equal(suspicious("src/a.ts", "function createBooking(input) {\n  log(input);\n  return {};\n}").length, 0);
  assert.equal(suspicious("app/s.py", "def create_row(data):\n    save(data)\n    return None").length, 0);
});

test("a function whose declaration line is not added is not reported", () => {
  const source = "function createBooking(input) {\n  return {};\n}";
  // Only the body line is added; the declaration already existed.
  assert.equal(suspicious("src/a.ts", source, { only: (n) => n === 2 }).length, 0);
});

test("test files are skipped", () => {
  const source = "function createBooking(input) {\n  return {};\n}";
  assert.equal(suspicious("test/booking.test.mjs", source).length, 0);
  assert.equal(suspicious("app/tests/test_booking.py", "def create_row():\n    return None").length, 0);
});

test("the finding names the file and line, and carries no code value", () => {
  const [f] = suspicious("src/actions.ts", "\n\nfunction createBooking() {\n  return {};\n}");
  assert.equal(f.file, "src/actions.ts");
  assert.equal(f.line, 3);
  assert.ok(!f.reason.includes("{}"), f.reason);
});
