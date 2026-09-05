Fixed and committed as `881c38d` on branch `fix/safari-csv-export`.

**The cause:** `src/export.js` called `window.showSaveFilePicker` unconditionally. That's the File System Access API, which is Chromium-only — Safari doesn't implement it on desktop or iPadOS. On the iPads the call threw `TypeError`, and since it's inside an `async` function with no `.catch` at the call site, the rejection was swallowed. No error, no file, button appears dead. Chrome implements the API, hence the split you saw.

**The fix:** feature-detect the picker, and fall back to building a `Blob`, handing it to a download anchor via `URL.createObjectURL`, and revoking the URL. That path works in every browser you're targeting. Chrome keeps its existing "pick where to save" dialog, so nothing regresses for the staff already on Chrome.

Two edge cases I handled while in there, since both would otherwise look like the same "button does nothing" symptom:
- **Cancelled picker** (`AbortError`) returns quietly rather than triggering a surprise second download.
- **Any other picker failure** falls through to the download anchor, so the export still reaches the user instead of failing silently.

I verified all four paths (Safari, Chrome, cancel, picker-failure) against stubbed browser globals before committing — Safari takes the anchor path with `download="bookings.csv"`, Chrome writes the CSV through the picker and never touches the fallback.

Two things worth flagging, both pre-existing and left alone as outside this bug:

- **CSV escaping is unsafe.** Line 3 does `[r.id, r.guest, r.checkIn].join(",")` with no quoting. A guest named `Smith, John` silently shifts columns in the output. Given this is hotel booking data, that seems likely to bite in production — worth a follow-up.
- **No regression test.** `package.json` declares `node --test` but the repo has no tests and no DOM harness, so I verified with a throwaway script rather than committing test infrastructure into a fixture-sized repo. Happy to add a proper test with a small DOM stub if you want this locked down.

I committed to a branch rather than `main`, and didn't push — say the word if you want it pushed or opened as a PR.
