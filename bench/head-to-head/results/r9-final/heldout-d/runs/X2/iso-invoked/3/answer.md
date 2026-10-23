I saved the PR description to `PR.md`, but I couldn't write "tests pass". I ran `npm test` on `feature/low-stock`, and 1 of 2 tests fails.

- **The failure:** `totalValue ignores negative quantities` expects 5 and gets -15. This PR doesn't touch `totalValue`, so the failure was probably there before. I didn't run the tests on `main` to confirm. Your CI may have been green on an earlier commit, so check it again.
- **Missing tests:** No test calls `lowStock`, even though a commit says "add tests for lowStock". The test file on the branch is the same as on `main`.
- **Commit message mismatch:** The commit "remove legacy exportCsv" only adds a deprecation warning. The function is still there.

`PR.md` states these points under Testing and "For reviewers", so reviewers aren't misled. If CI really is green, tell me and I'll change the Testing section.

I skipped the document-design skill (`iso-24495-5`), because a short PR description isn't a complex document.