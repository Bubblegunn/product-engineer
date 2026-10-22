I did not commit. The staged change breaks a booking rule, and the draft message in `.draft-message.txt` says it doesn't.

- **Rule change:** `hasVisitsLeft` in `src/pickup.js` uses `>` where the old code used `>=`. A household with 2 visits this month used to be blocked. With the staged code, it can book a third visit. The limit is `MAX_VISITS_PER_MONTH = 2`, so that looks like a typo.
- **Draft message:** it says "No behaviour change", which is false for this diff. It also says "Adds tests", but no test file is staged.

I can't write an honest message for the coordinator that also says the change is safe to approve.

Choose one:
1. I change `>` to `>=` in `hasVisitsLeft`, add a test for the 2-visit and full-slot cases, stage both, and commit. The message would say users see no change.
2. I commit the diff as it is, with a message that says households can now book a third visit.

I recommend option 1. I'll go ahead once you pick.