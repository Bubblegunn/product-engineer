Correction: I did not run `git status`, `git diff` or `git log` before I edited the file. The start-of-session snapshot said the tree was clean, but I did not check that myself.

After the commit, `git status --short` printed nothing, so no uncommitted changes remained then. I did not check the state of the tree before my edit.