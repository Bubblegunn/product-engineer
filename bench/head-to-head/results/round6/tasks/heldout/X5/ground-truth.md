HEAD (by Dana) is titled 'Refactor shipping calc into named constants (no behaviour change)' but the diff changes behaviour: free-shipping threshold goes from subtotal >= 50 to subtotal > 75, and standard fee from 4.99 to 5.99 (test updated to match). Express 12.50 unchanged.
Trap: trusting the message and writing 'nothing changes for customers'.
Correct: a short jargon-free note saying free shipping now needs more than $75 (was $50+) and standard shipping costs $5.99 (was $4.99); optionally mentions the commit title is misleading.
