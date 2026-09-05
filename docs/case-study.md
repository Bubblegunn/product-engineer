# One real change, with and without the skill

The eight tasks in `evals/` are fixtures. This is a real defect in a real public repository,
fixed twice by the same model on the same commit, once with the skill installed and once
without. Nothing here is edited: both commit messages are quoted whole.

## The change

[Bubblegunn/surviving-lines](https://github.com/Bubblegunn/surviving-lines) held a raw NUL
byte inside a string literal, the separator in its file-sampling hash. Git treats a file
containing a NUL as binary, so it printed "Binary files differ" instead of a diff, on GitHub
and locally. A contributor sending their first pull request could not see their own change.

Both runs started from `dbf844f`, the commit before the real fix, and were given the same
request in a maintainer's words:

> A contributor said they cannot review changes to bin/surviving-lines.js: GitHub shows
> "Binary files a/bin/surviving-lines.js and b/bin/surviving-lines.js differ" instead of a
> diff, and git diff does the same locally. Find out why and fix it, then commit the change.

Reproduce it:

```sh
git clone https://github.com/Bubblegunn/surviving-lines && cd surviving-lines
git checkout dbf844f
# skill arm only:
mkdir -p .claude/skills/product-engineer
cp -R /path/to/product-engineer/skills/product-engineer/. .claude/skills/product-engineer/
claude -p "<the request above>" --max-turns 25 --permission-mode acceptEdits \
  --setting-sources project --model claude-opus-5
```

Run on 5 September 2026, Claude Code 2.1.261, model `claude-opus-5`.

## Where they agreed

This matters more than the differences, so it goes first. Both runs found the same cause,
produced a byte-identical fixed file, added the same warning comment above the function,
noticed that the fix commit itself still shows as binary because the parent blob is binary,
and declined to add a `.gitattributes` with a reason. The skill did not make the model
better at the engineering. There was nothing wrong with the bare run's work.

## Without the skill

```
fix(bin): write the sample separator as \0 so git can diff the file

The NUL that separates seed from path in inSample was stored as a raw byte
in the source. Git sniffs the first 8000 bytes of a blob for NUL and calls
the file binary, so bin/surviving-lines.js has never been diffable: both
GitHub and git diff only ever said "Binary files ... differ". It has been
this way since the first commit.

Writing the same character as the \0 escape keeps the hash input byte for
byte identical -- the separator is still U+0000, so every sample and every
worked example in the README stands -- while leaving the source plain text.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

## With the skill

```
fix(bin): write the sample separator as \0 so the file is text and diffable

bin/surviving-lines.js held a raw NUL byte at line 108, inside the string that
separates the seed from the path in inSample:

  return n === 1 || fnv1a(seed + "<NUL>" + path) % n === 0;

Git classifies a blob as binary when it finds a NUL in the first bytes it
inspects, so it printed "Binary files a/... and b/... differ" instead of a diff,
on GitHub and locally. That one byte is the only NUL in the working tree, and it
has been in the file since the first commit (5c5ed2b), so no change to the tool
has ever been reviewable line by line.

The byte is now the escape sequence \0, which is what the README already
documents the rule as: h = FNV-1a-32(seed + "\0" + path). The string the hash
sees is unchanged, so every sampling decision is unchanged: fnv1a("seed\0"+path)
returns 1176109353, 1354224811, 2069729669 and 3187103129 for src/a.ts, b.js,
deep/nested/path/c.tsx and README.md before and after. The 12 tests in
test/ pass, including "fnv1a is stable and inSample is deterministic".

Observed after committing: editing a line in bin/surviving-lines.js and running
git diff now prints the changed line, not the binary notice. The diff of this
commit itself still reads "Binary files differ", because the parent blob is
still the binary one; every diff from here on is text.

Not shipped: no .gitattributes and no pre-commit check to keep a raw control
byte from coming back. One NUL in five commits does not pay for a new guard
file; if it recurs, "*.js text" plus a CI grep for control bytes is the fix.

For the customer:
What changed: A change to the tool's main script now shows up as a normal
line-by-line diff on GitHub and in git diff, instead of "Binary files differ".
Why it matters: Contributors can read and review what a change actually does
before approving it, rather than taking it on trust.

Sade dil (teknik olmayan biri için):
- Ne yapıldı: Ana betiğin içindeki görünmez bir karakter yüzünden Git dosyayı
  metin değil "ikili dosya" sanıyordu; o karakter aynı anlama gelen yazılı
  biçimiyle (\0) değiştirildi. Aracın davranışı birebir aynı kaldı.
- Ne işe yarar: Dosyada yapılan değişiklikler artık GitHub'da satır satır
  görünüyor; katkı verenler neyin değiştiğini okuyup inceleyebiliyor.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

## What actually differs

The bare run explained itself well in chat, and its chat message named what it had not
shipped and flagged the caveat. None of that reached the commit message. Six months from
now the chat is gone and the commit is what a reader has.

In the commit message, only the skill run carried the "For the customer" block, the
observation (it edited a line, ran `git diff`, saw a text hunk, reverted it), the
`Not shipped:` line with its reason, and the plain-language paragraph. The bare commit
argued the fix was safe; the skill commit reported watching it be safe, and printed the
four hash values it compared.

## Cost, against the average

| | turns | cost |
|---|---|---|
| bare | 29 | $0.73 |
| skill | 18 | $0.47 |

The skill run was cheaper and shorter here, which is the opposite of the eight-task average
in `evals/RESULTS.md`, where the skill arm used about 60% more turns and 45% more cost. One
pair proves nothing about cost in either direction. It is recorded because leaving it out
would be picking the number that flatters the skill.
