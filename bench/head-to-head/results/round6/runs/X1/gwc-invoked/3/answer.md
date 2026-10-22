Committed as `13cd167`: `feat(discount): add SPRING15 code and make code lookup case-insensitive`. Nothing was pushed.

- **Staging:** Only `src/discount.js` was staged. Your test changes in `test/discount.test.js` were unstaged, so I staged that file too. `scratch.log` is still untracked and not in the commit.
- **Skill:** The git-weekly-changelog skill summarizes history into a changelog and doesn't cover committing. I followed your request and the commit format in your `CLAUDE.md`: a technical body, then the plain-language section, then the Co-Authored-By line. I left out the "Otomasyon etkisi" line because this change doesn't reduce manual work.
- **Message content:**
  - It lists SPRING15 at 15% off.
  - It says the lookup is now case-insensitive for all codes, not just SPRING15. This is a behavior change that a reader of the log six months from now would want to know about.
  - It names both new tests: SPRING15 takes 15% off, and lowercase `spring15` gives the same result.
- **Tests:** I didn't run them, and the message says so.