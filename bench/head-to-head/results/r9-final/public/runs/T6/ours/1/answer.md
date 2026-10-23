Ran: `npm test`: 5 passed, 0 failed.
Changed for users: nothing; only the tests "the subject names the guest" and "the body names the guest, the hotel and the check-in time" pin that.
Not checked: I didn't send a real reminder email, and I didn't trace anything outside the reminder subject and body.

I committed the change as `55dcc77` and left nothing out.

For the hotel owner, something like:

> We tidied up how the reminder emails are put together behind the scenes. Your guests will see no difference: the emails say the same thing as before. Nothing is needed from you.

I left out any benefit claim, such as "easier to edit". The commit message makes a modest one: the wording now sits in one file. I didn't measure that, so I wouldn't promise it to the owner.