Ran: `npm test`: 5 passed, 0 failed.
Changed for users: nothing; only the tests "the subject names the guest" and "the body names the guest, the hotel and the check-in time" pin that.
Not checked: no real reminder email was sent, and I compared the old and new wording by reading the diff, not by running both.

I committed it as 2058a44 with nothing left out.

**For the hotel owner:** "We tidied up how the reminder emails are put together. Your guests will get the same emails as before, with the same wording and timing, so there is nothing for you to do or watch for. It does make future wording changes quicker, so tell us if you'd like the text adjusted."

I left out any claim that the emails are faster or more reliable, since I didn't measure either.