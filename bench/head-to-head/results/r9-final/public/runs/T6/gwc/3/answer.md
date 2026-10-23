I committed the change as `621919b`: "refactor(mail): move reminder email wording into messages.js".

**What to tell the hotel owner:** nothing changes for them or their guests. This was an internal tidy-up of the code. The reminder emails read the same as before, with the same greeting, check-in time and sign-off, and they go out when they did before.

There is one small wording difference. The subject line used to be "Your stay **starts** tomorrow, {name}" in the original code, and it still is. But the old subject was "Your stay starts tomorrow", so I compared the two versions to be sure. The old subject was `Your stay starts tomorrow, ${guest.name}`, and the new one is identical. The body is identical too.

If you want one line to pass on, something like this would work: "We reorganised how the reminder emails are put together behind the scenes. The emails guests receive are unchanged. The wording now lives in one place, so changing it later will be easier. If you'd like any wording changed, tell us."

I only read the diff and didn't run any tests, so I haven't confirmed the output by running it.