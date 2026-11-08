# Intuitiveness score — 8 Nov 2026

**Result: 6.6 / 10 (66 / 100).** With the six fixes at the end it should reach about **8 / 10**.

Checked on a local copy (browser storage only, Admin role), desktop 1440px and phone 375px, after the 7–8 Nov fixes.
Nothing was saved: forms were opened, cancelled or submitted empty. Not covered: other roles, real phones, real staff.

## How the score is calculated

Score = 50% **measured numbers** (Part A) + 50% **usability rules** (Part B, Nielsen's 10 heuristics).
Each item is scored 0–10 against a benchmark so the audit can be repeated after changes.

## Part A — measured numbers (average 6.7)

| # | What was measured | Result | Benchmark | Score |
|---|---|---|---|---|
| A1 | Links in the left menu | 18 links in 3 groups | ≤ 7 = 10, ≥ 25 = 0 | **3.9** |
| A2 | Clicks for 8 everyday tasks (table below) | average 3.6 clicks | ≤ target = 10, −1 per extra click | **9.5** |
| A3 | Text smaller than 12.5px (desktop, 9 screens) | 43% of text | 0% = 10, 100% = 0 | **5.7** |
| A4 | Phone tap targets under 44px (4 screens) | 64% too small | 0% = 10, 100% = 0 | **3.7** |
| A5 | Icon buttons with no name | 0 found | 0 = 10 | **10** |
| A6 | Sideways scrolling on phone | none | none = 10 | **10** |
| A7 | Codes/jargon on screen (CRN, kWp, DISCOM, UGVCL) | CRN on every card; kWp 20× on Customers | staff know these terms | **7** |
| A8 | Languages | English only | staff/partners need Gujarati or Hindi | **3** |
| A9 | Same status shown everywhere | next step now unified; still 3 progress ideas (11 stages, journey, current work) | one progress model = 10 | **7** |

Formula: (3.9 + 9.5 + 5.7 + 3.7 + 10 + 10 + 7 + 3 + 7) ÷ 9 = **6.66**

### Clicks per task (starting from any screen)

| Task | Clicks | Target | Score |
|---|---|---|---|
| Find a customer by phone | 2 (search, pick) | 2 | 10 |
| Call a customer | 3 | 3 | 10 |
| WhatsApp a customer | 3 | 3 | 10 |
| Add a new lead (2 required fields) | 2 + typing | 3 | 10 |
| Prepare a quotation | 3 (was 5 before 7 Nov fix) | 3 | 10 |
| Move to the next stage (with confirmation) | 4 | 4 | 10 |
| Record a payment (4 fields) | 5 (search, pick, Finance tab, Add payment, Save) | 4 | 9 |
| Save a Google Drive folder link | 5 (search, pick, Documents tab, Add link, Save) | 4 | 9 |

## Part B — usability rules (average 6.6)

| # | Rule | Score | Evidence |
|---|---|---|---|
| B1 | Shows what is happening | 8 | Today counts, "1 day late", loading messages, stage shown on every customer |
| B2 | Speaks the user's language | 6 | Plain sentences ("Waiting for the customer to approve the quotation") but English only and codes on every card |
| B3 | Easy to back out | 7 | Cancel on every form, Escape closes dialogs, Trash can restore; no undo after a payment or stage move |
| B4 | Consistent | 6 | Three progress ideas on one page; "Completed" sits under Operations; Name check separate from Documents |
| B5 | Prevents mistakes | 6 | Confirm before moving stage, required fields checked; a lead can move on while the quotation is still unapproved, with no warning |
| B6 | Recognise, don't remember | 8 | Labelled menu, search hints, next step written out on each customer |
| B7 | Fast for experienced staff | 8 | Global search (name/phone/CRN), 20 keyboard shortcuts, stage filters |
| B8 | Clean and focused | 6 | Calm design, but 18 menu links, 43% small text, about 4 customers per screen |
| B9 | Clear error messages | 8 | e.g. "Please enter the customer's full name." |
| B10 | Help and guidance | 3 | No in-app help, tips or first-day tour |

Formula: (8 + 6 + 7 + 6 + 6 + 8 + 8 + 6 + 8 + 3) ÷ 10 = **6.6**

**Total = 0.5 × 6.66 + 0.5 × 6.6 = 6.63 → 6.6 / 10**

## Fixes that raise the score most

| Fix | Moves | Expected gain |
|---|---|---|
| 1. Menu down to ~8 links (merge Finance pages, move Name check/Activity/Trash/Completed inside other pages) | A1 3.9→9.4, B8 | +0.45 |
| 2. Bigger tap targets on phone (44px buttons, chips and tabs) | A4 3.7→8 | +0.25 |
| 3. Minimum 13px text for details and labels | A3 5.7→8.5, B8 | +0.25 |
| 4. Gujarati/Hindi labels for partner and field screens | A8 3→8, B2 | +0.35 |
| 5. Short help: one "How this works" tip per screen + first-login tour | B10 3→7 | +0.2 |
| 6. One progress model (6 milestones on top, 11 stages inside) | A9, B4 | +0.15 |

Total after all six ≈ **8.0 / 10**. Fixes 1–3 are small CSS/menu changes; fix 1 needs a design decision (see ADR process).

## Re-score after the fixes (same day, same method)

| Item | Before | After | Measured |
|---|---|---|---|
| A1 Menu links | 3.9 | **9.4** | 8 links |
| A2 Clicks per task | 9.5 | 9.5 | unchanged |
| A3 Small text | 5.7 | **10** | 0% under 12.5px on Today, Customers, customer page, Overview, Finance, Materials |
| A4 Phone tap targets | 3.7 | **10** | 0% under 44px on Today, Customers, customer page, customer Documents |
| A5–A6 | 10 / 10 | 10 / 10 | |
| A7 Jargon | 7 | 7 | unchanged |
| A8 Languages | 3 | **6** | Gujarati/Hindi on partner and field screens; office and shared frame still English |
| A9 One status/progress | 7 | **9** | one progress card |
| B2 User's language | 6 | 7 | |
| B4 Consistent | 6 | 7 | same tab pattern everywhere |
| B8 Clean and focused | 6 | 8 | |
| B10 Help | 3 | 7 | tips + tour |

Part A = 80.9 ÷ 9 = 8.99. Part B = 74 ÷ 10 = 7.4. **Total = 8.2 / 10** (was 6.6).

Still to gain: translate the office screens and shared frame (A8), warn before moving a stage while the stage's work is open (B5), undo for payments/stage moves (B3).
