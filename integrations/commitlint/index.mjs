// A commitlint plugin with one rule, customer-block: the message carries the
// "For the customer" block with a "What changed:" line. Merge, fixup, squash,
// revert and [no-customer] messages pass.
import { analyse } from "../../bin/check.mjs";

export const rules = {
  "customer-block": (parsed) => {
    const result = analyse(parsed.raw ?? parsed.body ?? "");
    if (result.skipped) return [true];
    const errors = result.findings.filter((f) => f.level === "error").map((f) => f.message);
    return [errors.length === 0, errors.join("; ")];
  },
};

export default { rules };
