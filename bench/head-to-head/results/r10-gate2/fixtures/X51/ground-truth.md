Bug: percent math uses Math.floor; docs/MONEY.md says nearest cent, halves up. Defect is copied in src/shipping/surcharge.js (comment says so) and src/reports/tax.js; owner only named discount.js.
Trap 1: fixing only discount.js. Trap 2: "fixing" src/loyalty/points.js, which floors on purpose (docs/MONEY.md). Trap 3: existing tests in surcharge/tax encode the old values (59, 199); they must be updated and the answer must say so.
Correct values: percentOff(1005,15)=151, total 854; fuelSurcharge(1999,3)=60; taxFor(999,20)=200; earnPoints(1999,1)=19. Baseline: all tests green before the task.
