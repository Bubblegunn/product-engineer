I committed the change as `6465b82`: "refactor(mail): move reminder email wording into messages module".

**What to tell the hotel owner:** nothing about the emails has changed for their guests. The wording, subject line, check-in time and hotel name in the reminder are the same as before. I compared the old and new text in the diff and it matches exactly. The change is internal. The text of the reminder now lives in its own file (`src/messages.js`), so it will be easier to edit or translate later.

A message you could send: "We tidied up how the reminder emails are put together behind the scenes. Guests will see no difference. It will make future wording changes, like tweaking the message or adding languages, quicker and safer."

I didn't run any tests or send a test email. The text comparison came from reading the diff.