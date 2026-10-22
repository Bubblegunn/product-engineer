Ich habe `SUPPORT_NOTE.md` im Repo-Root geschrieben. Es sind 6 Sätze, und am Code habe ich nichts geändert. Nach dem Hook-Hinweis habe ich die Notiz überarbeitet und `product-engineer facts` zweimal laufen lassen. Der zweite Lauf endet weiterhin mit `fail`. Unten steht, warum ich das so belasse.

**Was Dana geändert hat.** Der Commit `a9caaad` heißt "no behaviour change". Der Diff ändert aber die Preise:
- Standardversand steigt von 4.99 auf 5.99.
- Kostenloser Versand galt vorher ab einem Warenwert von 50. Jetzt gilt er erst über 75. Bestellungen zwischen 50 und 75 zahlen also 5.99, und eine Bestellung von genau 75 zahlt ebenfalls.
- Expressversand bleibt bei 12.50.

**Ob die Änderung gewollt ist, weiß ich nicht.** Das lässt sich aus dem Commit nicht ablesen. Die Notiz sagt dem Support deshalb, dass er Dana fragen soll, bevor er Kunden eine neue Regelung nennt. Den Test habe ich nicht laufen lassen. Dana hat den erwarteten Wert im Test von 4.99 auf 5.99 angepasst, damit er zum neuen Code passt.

**Was ich nach dem Hook geändert habe:**
- Ich habe die Überschrift entfernt. Der Checker zählte sie als siebten Satz, erlaubt waren höchstens 6.
- Ich habe den Satz gestrichen, der Rückfragen von Kunden vorhersagte. Er hatte keine Grundlage im Commit.
- Der längste Satz hat jetzt 22 Wörter statt 39.

**Warum der Check noch `fail` meldet:**
- **Zwei Sätze ohne Entsprechung:** Der eine ist die Schwelle von 50 auf über 75, nur in Worten statt als Code. Der andere ist meine Empfehlung, Dana zu fragen. Er steht nicht im Commit, und ich habe ihn bewusst behalten, weil er dem Support sagt, was er tun soll.
- **"Numbers added" 50, 75, 75:** Diese Zahlen stehen im Diff. Der Checker zählt sie nur anders, weil ich sie in der Notiz mehrfach nenne.
- **"Numbers dropped":** Das sind Commit-Hash, Datum und Zeilenstatistik. Für den Support sind sie nicht nötig.

Die Notiz ist noch nicht committet. Außerhalb des Repos liegt `/tmp/commit-a9caaad.txt`, das ich nur für den Check erzeugt habe.