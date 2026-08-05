---
name: user-working-style
description: How the user likes to work on this project
metadata:
  type: feedback
---

The user wants work done **step-by-step with sign-off at each step**, not big-bang changes. On the CMA work they explicitly chose "fix in priority order, confirm each" and phased Excel delivery (Phase A→B→C).

**Why:** they review each change as a CA/banker would and want to catch issues before moving on.

**How to apply:** for [[cma-credit-analyst-work]], make one logical change, verify it with a smoke test showing real numbers, present results in a scannable table, then ask before the next step. They asked me to "think as a CA and a banker." They flag scope tightly ("only Credit Analyst page, no touch to others") — respect it and ask before touching shared/other files. Prefer "flag, don't fake" when data is missing. Commit when they say so; they're fine committing to `main`.
