I committed the change as `97b2f59`.

**What to tell the hotel owner:** nothing about the guest emails has changed. The reminder text is identical, word for word. I moved the wording into its own file, `src/messages.js`, and `src/mail.js` now calls it. Guests will see the same subject ("Your stay starts tomorrow, <name>") and the same body. The only difference is internal. Changing the email wording later is now a one-file edit.

You could say: "We tidied up how the reminder emails are built behind the scenes. Guests will notice no difference. It will make future wording changes, like adding your own greeting or house rules, quicker for us to do."

I checked this by reading the diff, and the strings match the originals. I didn't run any tests.