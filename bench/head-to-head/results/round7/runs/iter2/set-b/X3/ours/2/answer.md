Rewrote `docs/late-fees.md` in place and committed it as `44a8fd5`. I compared the new text against the old one by reading it. I ran no tests, because the change is docs only.

- **Rules:** every rule and number is unchanged. That covers loan lengths, the two renewals unless another patron has a hold, the 3-day grace period (not for DVDs), the per-day fees, the $10.00 cap, suspension at $5.00 or more owed, the under-12 exemption, and billing as lost after 60 days.
- **New wording:** I added a definition of "overdue" and split the page into short sections.
- **DVD wording:** the old text says only that DVDs get no grace period. I wrote that the DVD fee "starts right away". Check that this matches how your system counts the first fee day.
- **Renewal wording:** I wrote "you get more time, two times". The old text doesn't say how much time a renewal adds, and neither does mine.
- **Commit message:** it has the "For the customer" block. I first left off the `Co-Authored-By` line and then amended the commit to add it, which is why the hash is `44a8fd5` and not `be4337e`.