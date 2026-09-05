Fixed and committed on branch `fix-export-safari-ipad` (commit `b27679f`).

**The bug:** `src/export.js` called `window.showSaveFilePicker` unconditionally. Safari implements no File System Access API on any platform, so on iPad the property is `undefined` and the call threw. Because `exportBookings` is `async`, that throw became a rejected promise the button handler never surfaced — hence a tap that silently does nothing.

**The fix:** feature-detect the picker; when it's absent, download the CSV via a Blob object URL and an anchor. Chrome and Edge keep the save dialog. Three details the fallback gets right for Safari specifically — it stays synchronous so the click remains inside the user's tap, the anchor is attached to the document before being clicked, and revoking the object URL is deferred so the download isn't cancelled out from under itself.

**What I actually observed** — three `node --test` cases pass, covering the Safari download path, the anchor being attached-when-clicked with the right filename, and Chrome still using the picker with no fallback.

**What I could not observe, and you should check before this reaches the hotels:**
- I did not run this on a real iPad or in Safari. The tests use a stubbed `window`/`document`, which proves the branch is taken but not that iPadOS accepts the download. This is the one box worth ticking before release.
- The Export button's click handler is not in this repo — `src/export.js` is the only source file. I verified the exported function, not the call site. If that handler awaits something before calling `exportBookings`, Safari will have dropped the user-gesture window and the download will still fail.

**Not shipped, deliberately:**
- **Surfacing export errors to the user.** The silent rejection is why "nothing happens" was invisible to staff rather than merely broken; a caught error with a visible message would have made this a support ticket in a day instead of two hotels reporting it separately. That belongs in the button handler, which isn't in this repo. Worth doing next.
- **CSV escaping.** `[r.id, r.guest, r.checkIn].join(",")` corrupts any row whose guest name contains a comma or quote — "Smith, Jr." silently becomes two columns. This is a real, separate data bug that predates the Safari issue and affects Chrome equally. I left it alone because it isn't what you asked me to fix, but it's the thing in this file I'd fix next.
