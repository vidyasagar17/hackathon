# Number Quest — K-5 Math Diagnostic Platform

Built for the Nerdy AI Hackathon Challenge. Most math practice apps mark an
answer right or wrong and stop there. This one diagnoses *why* a wrong
answer happened and gives a hint aimed at that exact mistake.

It has two kinds of game, grouped on the home screen by grade band
(K–1, 2–3, 4–5):

- **Skill workshops** — column **subtraction, addition, multiplication and
  division**, one problem at a time.
- **Games against Robo** — card games from a K-5 game curriculum, played on
  one device against a computer opponent: **Decimal War** (grades 4–5), judge
  whose decimal is larger; **For Keeps** (grades 2–3), build two 2-digit
  numbers from four cards, subtract, and keep the lowest scores;
  **Multiplication Shootout** (grades 2–3), take turns with Robo answering
  times and division facts; **Don't Break the Bank** (grades 2–3), place
  rolled digits into numbers, add them, and get close to 1000 without going
  over; **Clock Match** (grades 2–3), read analog clocks and pick the clock
  for a time; **Target Number** (grades 2–3), add and take away cards one mental
  step at a time to make a target, then fill in an equation; **Fraction
  Spoons** (grades 4–5), draw and
  discard to collect four equal fractions and win a spoon; **The 24 Game**
  (grades 4–5), use all four cards with + − × ÷ and parentheses to make 24;
  **Coordinate Plane Battleship** (grades 4–5), write and read ordered pairs
  to find Robo's hidden ships; **Volume Builder** (grades 4–5), count the
  cubes in a drawn box, then build a different box that holds as many;
  **Addition War** and **Take-Away War** (grades K–1), flip two cards, add
  them or take the smaller away, and say whose hand wins; **Shut the Box**
  (grades K–1), roll two dice, add the dots, and shut tiles that make that
  many; **Four in a Row** (grades K–1), add two cards and cover the
  answer on a shared board to get four in a row; and **Cover the Number**
  (grades K–1), roll, count the dots, and cover that number on your board.

## How diagnosis works

Wrong answers and moves are diagnosed by pure, deterministic, pytest-covered
functions. An LLM never guesses the diagnosis.

**Workshops.** Each workshop generates a problem at one of three levels
(grounded in Common Core, e.g. 2.NBT.B.7, 4.NBT.B.5) and simulates the answer
a student *following a specific known buggy procedure* would write; the
simulator that matches the student's answer is the diagnosis. This follows
Brown, J. S., & Burton, R. R. (1978), [*Diagnostic models for procedural bugs
in basic mathematical skills*](https://doi.org/10.1207/s15516709cog0202_4),
Cognitive Science, 2(2), 155-192. Each workshop has 5 misconceptions, e.g.
subtraction's "borrow across zero failure"; a misconception can have more
than one simulator for different ways of writing it (e.g. a carry bug with the
last column written in full), and when two bugs give the same answer the more
specific one wins. The server rejects a problem the browser has edited.

**Decimal War.** Each round deals both sides 1–3 digit cards after "0." and
the student picks the larger number. The detectors follow decimal-comparison
research — Steinle, V., & Stacey, K. (1998), *The incidence of misconceptions
of decimal notation amongst students in Grades 5 to 10* (32% of Grade 5
students chose longer decimals as larger); Steinle & Stacey (2001), *Visible
and invisible zeros*; and Resnick, L. B., et al. (1989), *Conceptual bases of
arithmetic errors: The case of decimal fractions*:

| Diagnosis | Wrong pick |
|---|---|
| `longer_is_larger` | picks the number with more decimal places (0.45 over 0.8) |
| `shorter_is_larger` | picks the number with fewer decimal places (0.8 over 0.85) |
| `reciprocal_thinking` | picks the smaller of two same-length numbers (0.3 over 0.4) |
| `ignores_zero` | says 0.3 and 0.03 are the same |

Each level deals only the comparison types that reveal its misconceptions
(level 1 same length, level 2 different lengths, level 3 zeros and equal
pairs with a "They're the same" choice).

**For Keeps.** Four hands; in each, the student arranges four digit cards into
two 2-digit numbers, types the difference, then keeps or trashes it. Each
player keeps exactly two scores and the lowest total wins (rules from Kristin
Raia, "5 Rich Math Activities," Edutopia, learned from Jennifer Bay-Williams
and Dan Meyer). Only the typed difference is graded, against two-digit versions
of the subtraction workshop's buggy procedures (Brown & Burton, 1978);
arranging and keep/trash change the game but are not logged, so they never
affect levels or the summary.

| Diagnosis | Wrong difference |
|---|---|
| `zero_minus_digit_gives_digit` | writes the bottom digit under a 0 (40 − 23 → 23) |
| `smaller_from_larger` | takes the smaller digit from the larger in each column (73 − 58 → 25) |
| `borrowed_without_decrementing` | borrows but leaves the tens digit unchanged (62 − 38 → 34) |
| `always_borrow` | borrows even when the ones don't need it (57 − 32 → 15) |

A kept score is always the correct difference, so a wrong answer never lowers
a total. Robo plays by level: level 1 pairs its cards in the order dealt and
keeps any difference under 30; levels 2–3 build the smallest difference and
keep under 20 and under 10. When a keep or trash is forced (every player ends
with exactly two keeps), the other button is disabled and the reason shown.

**Multiplication Shootout.** A duel of ten turns: Robo calls a single-digit
fact, the student answers it on the keypad, then Robo answers a fact of its
own. Level 1 deals ×0, ×1, ×2 and ×5 facts; level 2 facts with both numbers
3–9; level 3 any fact, about a third of them as division facts. The detectors
follow fact-retrieval error research — LeFevre, J., et al. (1996), *Multiple
routes to solution of single-digit multiplication problems* (72–76% of errors
share a number with the correct fact, and errors on ×0 facts answer with the
other number), and Campbell, J. I. D. (1997), *On the relation between skilled
performance of simple division and multiplication* (division is solved
through the multiplication fact):

| Diagnosis | Wrong answer |
|---|---|
| `times_zero_is_the_other_number` | answers with the other number on a ×0 fact (7 × 0 → 7) |
| `added_instead_of_multiplied` | adds the two numbers (4 × 6 → 10) |
| `neighboring_fact` | gives the answer to the fact one step away (6 × 7 → 48) |
| `one_group_off` | a division answer one away from the right one (56 ÷ 8 → 6) |

When two diagnoses fit, zero wins, then adding (on small facts most slips are
addition, LeFevre et al.). Robo misses every fact above its level's size
cutoff (12, 49, 54 — right on about 70%, 80% and 91% of each level's facts)
by answering the fact one step down, and a wrong Robo answer always shows
the right one.

**Coordinate Plane Battleship.** Battleship on a first-quadrant grid, 8 turns
each. On your shot you tap a point on Robo's ocean to aim, then write its
ordered pair with number buttons and fire — the shot lands where the pair you
wrote says. On Robo's shot, Robo calls a pair and you tap that point on your
own ocean. Both are graded, so each turn checks both directions of 5.G.A.1.

| Diagnosis | Wrong answer |
|---|---|
| `swapped_x_and_y` | writes (5, 3) for the point 3 across and 5 up, or taps (4, 2) for (2, 4) — the most reported coordinate-graphing error in grades 5–6 |
| `counted_from_one` | counts the corner as 1: writes (4, 6) for (3, 5), or taps (1, 3) for (2, 4) — Sarama, J., et al. (2003), *Development of mathematical concepts of two-dimensional space in grid environments* |

Level 1 is a 0–4 grid with no ship on an axis, level 2 a 0–5 grid where pairs
can have a 0, level 3 adds a third ship. Robo aims at random at level 1, then
hunts next to its hits (level 2) and also hunts on a checkerboard (level 3).

**Volume Builder.** A duel of five turns. Each turn the student counts the
unit cubes in a drawn box (front, top and right side, every cube edge shown)
and types the number, then builds a different box with the same number of
cubes by setting its length, width and height (1–10). Both are graded, and a
build is diagnosed by the same rules run the other way: the mistake whose
number for the student's box equals the target. Examples are for a 4 × 3 × 2
box (24 cubes).

| Diagnosis | Wrong answer |
|---|---|
| `counted_visible_faces` | 26: the squares on the top, front and side — Ben-Chaim, D., Lappan, G., & Houang, R. T. (1985), *Visualizing rectangular solids made of small cubes*; Hirstein, J. (1981), *The second national assessment in mathematics: Area and volume* |
| `counted_visible_cubes` | 18: only the cubes you can see — Ben-Chaim et al. (1985); Battista, M. T., & Clements, D. H. (1996), *Students' understanding of three-dimensional rectangular arrays of cubes* |
| `counted_all_six_faces` | 52: the squares on all six sides (visible faces doubled, or edge cubes counted twice) — Ben-Chaim et al. (1985); Battista & Clements (1996) |
| `counted_outside_cubes` | 56 for a 4 × 4 × 4 box: the outside cubes, missing the middle — Battista & Clements (1996) |
| `counted_one_layer` | 12, 8 or 6: one layer (top, front or side) — Battista & Clements (1996); Tan Şişman, G., & Aksu, M. (2016), *A study on sixth grade students' misconceptions and errors in spatial measurement* |
| `added_the_edges` | 9: 4 + 3 + 2 — Tan Şişman & Aksu (2016) |
| `doubled_visible_cubes` | 36: the visible cubes doubled for the hidden back — Ben-Chaim et al. (1985) |

Earlier rows win when two give the same number. Level 1 deals boxes with
edges 2–4 and at most 36 cubes, level 2 edges 2–5 and 40–100 cubes (too many
to count one by one), level 3 edges 3–6, so every box hides a middle. Every
dealt box has another box with the same cubes, and no mistake gives its right
number. Robo always counts right, by layers (*"Robo counted 6 cubes in the top
layer and 4 layers: 4 × 6 = 24."*), and never builds a box with an edge of 1:
at level 1 it only halves one edge and doubles another, at level 2 it keeps
one edge, at level 3 it tries every box (it finds one about 47%, 79% and 94%
of the time).

**Clock Match.** A duel of eight turns. Each turn is either a clock to read
(pick its time from four cards) or a time to set (pick its clock from four
clocks); the wrong choices are built from the mistakes below. Level 1 is o'clock
and half past, level 2 five-minute times from :05 to :25, level 3 from :35 to
:55, where the hour hand is almost at the next numeral. Robo is never shown a
wrong time: it knows its card 50%, 65% or 80% of the time by level, or says it
wasn't sure.

| Diagnosis | Wrong answer |
|---|---|
| `read_the_next_hour` | reads 2:50 as 3:50, the hour hand being close to the 3 — Williams (2012), via Earnest, D., Gonzales, A. C., & Plant, A. M. (2018), *Time as a measure: Elementary students positioning the hands of an analog clock* |
| `hour_hand_on_the_numeral` | picks a clock for 2:50 with the hour hand right on the 2 — Earnest et al. (2018): the hour hand was set right far less often than the minute hand, and matching it to the hour's numeral was the most common approach |
| `swapped_the_hands` | reads the long hand as the hour and the short hand as the minutes (3:10 as 2:15), or picks the clock with them swapped — Mutlu, Y., & Korkmaz, E. (2020), *Investigating clock reading skills of third graders with and without dyscalculia risk* |
| `minute_numeral_as_minutes` / `minute_hand_on_the_minutes_numeral` | reads 10:10 as 10:02, or points the minute hand at the 10 for 10 minutes — the same number matching, for the minute hand |

**Target Number.** Illustrative Mathematics' "Hitting the Target Number"
(2.OA.B.2) as a duel of five hands. The student starts with a card, then taps
+ or −, a card, and types the new total; every step is graded and shown as its
own equation, and a wrong step goes on from the right total. Making the target
with every step right scores a point. After Robo's turn, one equation question
is graded: *16 = 2 + □* at level 1, *1 + 15 = 2 + □* at levels 2–3, both sides
making the target.

| Diagnosis | Wrong answer |
|---|---|
| `counted_on_from_start` | 14 + 3 → 16: counting on says the start number again — Secada, W. G., Fuson, K. C., & Hall, J. W. (1983) |
| `counted_back_one_off` | 14 − 3 → 10 or 12: counting back ends one step early or late — Fuson, K. C. (1984, 1986) |
| `subtracted_instead`, `added_instead` | the other operation — Fuson (1984) |
| `smaller_from_larger` | 42 − 8 → 46: the smaller ones digit taken from the larger (Brown & Burton, 1978) |
| `forgot_to_change_the_tens` | 38 + 7 → 35, 42 − 8 → 44: a step across a ten without changing the tens (Brown & Burton, 1978) |
| `answer_to_equal_sign` | 1 + 15 = 2 + □ → 16: the left side's answer — Falkner, K. P., Levi, L., & Carpenter, T. P. (1999), *Children's understanding of equality: A foundation for algebra* |
| `added_all_numbers` | 1 + 15 = 2 + □ → 18, or 16 = 2 + □ → 18: every number added — Falkner et al. (1999); McNeil, N. M., & Alibali, M. W. (2005) |

On equations with operations on both sides, second graders were right only 6%
of the time (Matthews, P. G., & Fuchs, L. S., 2018, *Keys to the gate? Equal
sign knowledge at second grade predicts fourth-grade algebra competence*).
Level 1 deals cards 1–10 and a target of 10–20 with totals up to 20; level 2 a
target of 21–40 with totals up to 99 (one-digit steps across tens); level 3
adds two cards of 11–40 and a target of 30–99. Every hand has a way. Robo never
adds or takes away wrongly and uses at most 2, 4 and 4 cards by level (it finds
a way about 47%, 75% and 85% of the time).

**Don't Break the Bank.** Math for Love's place-value game: the same rolls
of a die go to the student and Robo, and each roll is placed for good in a
hundreds, tens or ones spot of three numbers. Then the student types the sum
and, when it isn't over the bank, how far it is from the bank; placing is
strategy and not graded. Closest to the bank without going over wins.

| Diagnosis | Wrong answer |
|---|---|
| `no_carry`, `carry_always`, `reversed_carry`, `carry_drops_at_second_column`, `drops_final_carry` | the addition workshop's carrying bugs, worked on three numbers column by column (Brown & Burton, 1978) |
| `wrote_column_sums_side_by_side` | 456 + 365 + 163 → 81714: each column's whole sum written next to the others — Price, P. (2002), *"Face-value" and "independent-place" constructs* |
| `added_digits_as_ones` | 456 + 365 + 163 → 39: every digit added as ones — face-value thinking (Ross, 1989) |
| `stops_borrow_at_zero`, `borrow_across_zero_failure`, `zero_minus_digit_gives_digit`, `zero_minus_digit_gives_zero` | 1000 − 687 → 1423, 413, 1687 or 1000: borrowing across the bank's zeros — Burton, R. R. (1982), *Diagnosing bugs in a simple procedural skill* |

Level 1 is two 2-digit numbers under 100, level 2 the classic three 3-digit
numbers under 1000 with a 1–6 die, level 3 the same with a 0–9 die. Robo
never adds wrongly; at level 1 it places each roll where its expected total
lands nearest an aim, and at levels 2–3 it looks ahead, finishing its board
40 times with made-up rolls and keeping the best spot (it breaks the bank in
about 14% and 21% of games, against 30% and 42% for the aim rule).

**Addition War and Take-Away War.** Everyday Mathematics' *Addition Top-It*,
one hand at a time: the student and Robo each flip two cards, Robo's total is
shown, the student taps their own total from four answer cards, then taps whose
hand wins (You, Robo or Same). Take-Away War takes the smaller card from the
larger. Every wrong answer card comes from a researched mistake:

| Diagnosis | Wrong answer card |
|---|---|
| `one_more_than_second` | one more than the second card, when it is the larger (3 + 4 → 5) — the most frequent preschool error in Siegler, R. S., & Shrager, J. (1984), *A model of strategy choice* |
| `counted_on_from_start` | counting on while saying the start number again (3 + 4 → 6) — Secada, W. G., Fuson, K. C., & Hall, J. W. (1983), *The transition from counting-all to counting-on in addition* |
| `subtracted_instead` | the difference instead of the sum (3 + 4 → 1) |
| `counted_down_off_by_one` | counting back ends one step early or late (8 take away 3 → 4 or 6) — Fuson, K. C. (1984, 1986) |
| `added_instead` | the sum instead of the difference (8 take away 3 → 11) |

When two mistakes give the same number, the nearest numbers that are not
researched mistakes fill the row to four cards and are not diagnosed. Only the
answer tap is graded and logged; the winner tap is checked on screen but not
logged, so an undiagnosed move never sits between two answer mistakes in the
level rule. Levels follow the standards: cards 0–5 (K.OA.A.5), then 0–10
(K.OA.A.2; addition sums within 10), then sums to 20 or a teen card minus a card
to 10 (1.OA.C.6).

**Cover the Number.** The classroom "roll and cover" game: each player has a
board of numbers, and on each of 10 turns the student rolls, counts the dots
and taps that number to cover it. A right tap on a number already covered lets
the student roll again once. Covering the whole board wins; after 10 turns,
more numbers covered wins. Level 1 rolls one die (board 1–6), level 2 shows a
card of 1–10 scattered dots (board 1–10, K.CC.B.5), level 3 rolls two dice
(board 2–12).

| Diagnosis | Wrong answer |
|---|---|
| `counted_one_too_many` | 6 for 5 dots: a dot counted twice, two number words for one dot, or a word left out — Kobayashi, W., et al. (2025), *Counting and subitizing skills in children with Down syndrome and autism spectrum disorder* (17 of the 28 counting errors of typically developing 3–5-year-olds), using Fuson et al.'s (1988) categories |
| `counted_one_too_few` | 4 for 5 dots: a dot skipped or a word said twice — Kobayashi et al. (2025) (3 of 28) |
| `one_more_than_second`, `counted_on_from_start`, `subtracted_instead` | with two dice, Addition War's counting mistakes |

Robo always counts right; when its number is already covered it rolls again 0,
1 or 2 times by level, so against a student who is always right it wins about
15%, 35% and 53% of games.

**Four in a Row.** A 5 × 5 board of numbers shared with Robo. Each turn two
cards show an addition fact and the student taps a space showing the sum; a
right tap covers it, a wrong tap covers nothing. Four in a row across, down or
corner to corner wins; if no fact can be dealt, most spaces covered wins. The
board holds the level's sums and the numbers its mistakes give, so a wrong tap
can show which mistake it was.

| Diagnosis | Wrong answer |
|---|---|
| `reversed_teen_digits` | 41 for 10 + 4: the teen written the way it is said, ones first — Clayton, F. J., et al. (2020), *Two-digit number writing and arithmetic in Year 1 children: Does number word inversion matter?* (32% of English-speaking Year 1 children's teen errors); Steiner, A. F., et al. (2021), *Language effects in early development of number writing and reading* |
| `one_more_than_second`, `counted_on_from_start`, `subtracted_instead` | Addition War's counting mistakes, with the fact's two cards |

Level 1 deals cards 0–5, level 2 a 10 and a card 1–9 (teen numbers as ten and
some ones), level 3 cards 0–10 with sums 11–20. Robo never adds wrongly: at
level 1 it covers the first space with its sum, at level 2 the one that lines
up most with its own spaces, at level 3 it also takes a winning space and
blocks three of the student's in a line.

**Shut the Box.** The classic dice game (tiles 1–9; roll two dice and shut
open tiles that add up to the roll; fewer tiles left is better), played box
against box with Robo. A student turn is three taps: **Roll**, pick how many
dots in all from four answer cards, then tap tiles and **Shut**. Both the
total and the shut are graded, one try each. Adding the dice reuses Addition
War's three detectors with the dice as the two cards; shutting tiles has two
more:

| Diagnosis | Wrong tiles |
|---|---|
| `tiles_counted_on_from_start` | 5 and 4 for an 8: counting on while saying the start number again ("5, 6, 7, 8") — Secada, Fuson & Hall (1983) |
| `added_the_total_tile` | the 8 tile with the 2 for an 8: making a number from parts read as a plain addition — Lindvall, C. M., & Ibarra, C. G. (1980), *Incorrect procedures used by primary grade pupils in solving open addition and subtraction sentences* |

A wrong total outlines the right card and goes on with the right total; a
wrong shut shuts a right way (fewest, highest tiles) so the student sees one.
When no open tiles make the total, that box is done; the game ends when both
boxes are done or one is empty, and fewest open tiles wins (counting, not
adding up to nine numbers). Level 1 uses dice with 1–3 dots and tiles 1–6
(K.OA.A.5), level 2 standard dice and tiles 1–9 (1.OA.C.6), level 3 tiles
1–12. Robo never adds or shuts wrongly; at level 1 it shuts the most tiles it
can (a weaker way), at levels 2–3 the fewest, highest tiles.

**Fraction Spoons.** The classroom *Spoons* game (Games 4 Gains) made
turn-based, with no grabbing race: the student and Robo each hold four
fraction cards, and a hand is won by the first correct claim that all four
equal the card being collected; first to 3 spoons wins. Each turn the student
picks a Collecting card, draws, taps **Fits** or **Doesn't fit** for the
drawn card, discards one card, then takes the spoon or hands the turn to
Robo. The fit tap and the claim are graded; picking and discarding are
strategy and not logged. Every set is a simple fraction times 1–4 (1/3, 2/6,
3/9, 4/12), and the deck adds mistake cards built from the student's own
Collecting cards:

| Diagnosis | Wrong move |
|---|---|
| `same_difference_means_equal` | says 2/3 fits with 1/2 (top and bottom 1 apart in both) — "gap thinking", Mitchell, A., & Horne, M. (2010), *Gap thinking in fraction pair comparisons*; adding the same number to top and bottom always makes this card, so additive scaling is the same diagnosis |
| `changed_only_top_or_bottom` | says 1/4 or 2/2 fits with 1/2 (only one part × 2) — Biber, Tuna & Aktaş (2013) |
| `bigger_numbers_not_equal` | says 4/8 doesn't fit with 1/2 — Braithwaite, D. W., & Siegler, R. S. (2018), *Developmental changes in the whole number bias* (the fraction with larger numbers judged larger 62.7% of the time) |

A wrong claim names the mistake most of its odd cards show. Level 1 deals
sets from 1/2, 1/3 and 1/4 with same-difference cards (3.NF.A.3.b); level 2
adds non-unit fractions, fifths and sixths, and one-part-only cards
(4.NF.A.1); level 3 skips multipliers and reaches hundredths (3/4 = 75/100).
Robo is never wrong: it collects what it holds most of, and the level only
sets how close to a set its starting hand is.

**The 24 Game.** The classroom 24 Game (Robert Sun, 1988) made turn-based: a
duel of five hands. Each hand the student taps their four cards, + − × ÷ and
parentheses into an expression (each card once) and presses **Check**; the
server works it out exactly and shows what it makes, step by step by the
order of operations (5.OA.A.1). Every check is graded, and the student can
edit and check again or press **Show me a way** (not graded, no point). Then
Robo shows its own hand. A wrong check is diagnosed only when the student's
expression makes 24 under a mistaken order:

| Diagnosis | Wrong expression |
|---|---|
| `left_to_right` | works every operation in the order written: 3 + 5 × 3 × 1 as if it were (3 + 5) × 3 × 1 — Bye, J. K., et al. (2024), *Perceiving precedence: Order of operations errors are predicted by perception of equivalent expressions* (15–22% of 837 middle schoolers kept going left to right); Blando et al. (1989); Tabak (2019) |
| `pemdas_letter_order` | does × before ÷ or + before −: 6 × 8 ÷ 1 × 2 as if it were 6 × 8 ÷ (1 × 2) — Glidden, P. L. (2008), *Prospective elementary teachers' understanding of order of operations* (38.0% multiplied before dividing) |

Hands are dealt by what their ways to 24 need, one new idea per level: level 1
a way with no parentheses and no ÷, level 2 parentheses but no ÷, level 3 ÷
(cards 1–9, then 1–10). Every way the game shows uses whole-number steps.
Robo finds 24 with only the kinds of way its level allows (no parentheses; at
most one pair and no ÷; at most one pair) — about 48%, 91% and 97% of its
hands — and never shows wrong math.

## Adaptive difficulty

`backend/tiering.py` moves a student up a level after 3 correct in a row and
down when the *same* misconception is diagnosed twice in a row, per game.
Stars on the page show progress; there are no timers.

Levels follow the *learner*, not the tab. A student picks a name and a token on
their first visit, which saves a `learner_id` in the browser's localStorage; the
session id in `sessionStorage` still marks one sitting, and the session summary
stays scoped to it. So closing the browser ends the session but not the
progress: a student who comes back tomorrow resumes at the level they reached
instead of starting again at level 1.

A device holds a roster, not one student, so a family tablet or a classroom
machine can be shared: tap a name to switch, and each profile has its own
levels and mastery. There are no passwords and no server accounts — a profile
exists so two students don't share one set of levels, not to keep anyone out.
Only the random id reaches the server.

## Starting band

A new student is asked their **age**, not their grade — a 5-year-old knows how
old they are more reliably than which band their grade sits in. `bandForAge` in
`frontend/src/gradeBand.ts` maps it: 5–6 to K–1, 7–8 to grades 2–3, 9–10 to
grades 4–5, with 4 and 11 pulled to the nearest shelf rather than refused. Each
age button names the shelf it leads to, so the mapping is never hidden, and
"Change grade" still overrides it for a student held back or moved up.

## The home screen engine

`backend/recommend.py` decides what the home screen leads with. It is pure and
deterministic, tested in `test_recommend.py`, and — like the diagnosis — an LLM
never picks the game or the reason.

Each game's tile carries its own state for that learner: `new` (never opened),
`learning` (fewer than 4 answers, or under 60% right), `growing`, or `strong`
(the top level reached at 80% or better). The tile shows the score and a meter
alongside the words, so the state is never carried by colour alone.

One game is then suggested, in this order:

| Reason | When | What Robo says |
|---|---|---|
| `stuck_on` | a misconception in this band was diagnosed twice or more | names the bug and offers another go |
| `keep_going` | a game is started but not yet strong | offers the most recently played one |
| `try_new` | every started game is strong, one is untouched | offers the new one |
| `stay_sharp` | everything in the band is strong | offers the lowest-scoring one |

Only games shelved in the student's own grade band are ever suggested. The
reason code maps to its sentence in `frontend/src/home.ts`, so what a student is
told always matches the rule that actually fired.

## Game intros

Every game opens on an intro before any problem is dealt: the game's name and
picture, a one-line pitch, what math it practices, and a **Watch how to play**
demo on the game's own table, followed by a **Your turn!** move to try. The
student steps through the demo with Next and Back and can press **Play!** at any
point; the game page (and its first round) only starts on Play, so reading an
intro and going home logs nothing.

- **The demo shows the real rules on real numbers.** Each step brings in one new
  piece — a card dealt, a die rolled, a tile shut, a clock hand turning, a
  borrowed ten moving to the ones — and only that piece moves, so the demos keep
  the one-thing-animates rule. Under `prefers-reduced-motion` nothing moves.
  `intros.test.tsx` walks every game's demo and fails if a step moves more than
  one piece or if anything moves under reduced motion.
- **The try-it move is practice, never graded or logged.** Its wrong choices are
  the mistakes the game diagnoses (e.g. 3:30 for a clock showing 2:30, 25 for
  43 − 18 with no borrow), a wrong tap wobbles and shows the right way in ink,
  and a right tap gets one short pulse.
- **K–1 intros speak** the pitch and each step once the browser allows it, as
  the K–1 games do; the others have read-aloud buttons.

The intros replace the workshops' old first-visit "How to play" screen. Each
game's words live in `frontend/src/intros/` (one file per grade band and one for
the workshops, with the demo tables drawn in a matching `*Scenes.tsx` file).

## Replaying the mistake

A wrong answer in a workshop offers **"Show me what I did"**: the student's own
work walked column by column beside the correct work, right to left, the way
they would have worked it. Each step names the two digits that column was worked
from and what was written there, and the diagnosed explanation appears exactly
when the walk reaches the place where the two answers part company.

`frontend/src/replay.ts` builds the walk from the two answers rather than from
the buggy simulators. The server has already decided *which* bug this was, and
the digits it produced are what the student actually wrote, so the replay can
never invent reasoning the diagnosis didn't find.

One digit lands per press, the press is the student's own, and nothing moves
under `prefers-reduced-motion` — so this stays inside the one-thing-animates
rule below. Column games only: long division's algorithm doesn't lay out in
places this way, the same reason it skips the regroup animation.

## Hints

Hints start as a sentence **built by code from the student's own numbers**
(`sentences.py` in each game), e.g. *"Give both numbers the same number of
digits: 0.45 and 0.80. 80 hundredths is more than 45 hundredths, so 0.8 is
larger."* An LLM (Qwen2.5-7B-Instruct via Hugging Face) may only **reword**
it to sound friendlier, within a 4-second total deadline, and the rewording
is shown only if it keeps every number, operation (× ÷ + −, or the words
times, divided by, plus, minus), place name (including tenths, hundredths,
thousandths), comparison word, "same", and carry/borrow word in order, and
uses no banned jargon (`backend/games/hint_check.py`). Otherwise
the student sees the code-built sentence. A hand review of live LLM-written
hints found wrong advice in 6 of 32 samples, which is why the LLM phrases but
never reasons. A wrong answer with no diagnosis gets a fixed general hint.

- **Workshops:** the first miss says "Not quite"; the second replays the
  correct borrow or carry on the student's own numbers, then shows the hint
  and the diagnosed pattern.
- **Decimal War:** a wrong pick outlines the larger number and offers
  "Show me why", which draws both numbers on hundredths grids beside the hint
  and diagnosed pattern. The hint is only fetched when the student asks.
- **For Keeps:** a wrong difference shows the right one and "Show me why"; the
  hint and diagnosed pattern appear in a panel beside the numbers, next to
  Keep it / Trash it, so nothing the student needs falls below the table.
- **Multiplication Shootout:** a wrong answer shows the right one and "Show me
  why" (e.g. *"48 is 6 × 8. 6 × 7 is 6 less: 48 − 6 = 42."*). Robo's own turn
  appears only when the student presses "Robo's turn", and the duel's result
  only on "See who won", so one new thing shows at a time; a win gets one
  short ring pulse, skipped under reduced motion.
- **Addition War and Take-Away War (K–1):** hints are never reworded by the
  LLM — they are read aloud to pre-readers and the counting sequence is the
  whole hint (e.g. *"Start at 4 and count on 3 more: 5, 6, 7."*). A wrong
  answer card wobbles once, the right card is outlined, and the hint is shown
  and spoken; there is no red text.
- **Coordinate Plane Battleship:** a wrong pair or tap shows both points and
  "Show me why", e.g. *"Across comes first, then up. Your aim is 3 across and
  5 up, so it is (3, 5), not (5, 3)."* Never reworded by the LLM: the fact
  check can't tell if "across" and "up" were swapped, the very mistake.
- **Volume Builder:** a wrong count or build shows the right number and "Show
  me why": the hint, the diagnosed pattern and the box with one layer shaded
  in the hint purple, e.g. *"18 is the cubes you can see. 6 more cubes are
  hidden behind and under them. The top layer has 4 × 3 = 12 cubes, and 2
  layers make 2 × 12 = 24."* Never reworded by the LLM: the fact check
  protects numbers but not "top", "hidden" or "layer".
- **Clock Match:** a wrong pick outlines the right card and "Show me why" gives
  the hint and diagnosed pattern, e.g. *"The minute hand on the 10 means 50
  minutes, so it isn't 3 o'clock yet. The hour hand is almost at the 3 but still
  after the 2: 2:50."* Never reworded by the LLM: the fact check can't protect
  "hour hand", "short" or "almost".
- **Target Number:** a wrong step total or equation answer shows the right one
  and "Show me why" in the panel, e.g. *"42 has only 2 ones, so use a ten: 42 is
  30 and 12. 12 − 8 = 4, so 42 − 8 = 34."* or *"1 + 15 = 16 is only the left
  side. = means both sides are the same amount, so 2 + □ must make 16 too: 2 +
  14 = 16."* Never reworded by the LLM: the fact check doesn't protect "both
  sides" or "only".
- **Don't Break the Bank:** a wrong sum or distance shows the right one and
  "Show me why" in the panel where the keypad was. Hints name the column the
  mistake got wrong (e.g. *"In the ones column, 6 + 5 + 3 makes 14, so write 4
  and carry 1 to the tens column."*), or trade the bank into smaller places
  and count up (*"1000 is 9 hundreds, 9 tens and 10 ones, so 1000 − 687 = 313.
  Or count up: 687 + 13 = 700, and 700 + 300 = 1000."*); they may be reworded
  by the LLM under the fact check, as in For Keeps.
- **Cover the Number (K–1):** a wrong tap wobbles, the right number is
  outlined, and the hint is shown and spoken, e.g. *"Say one number for each
  dot, and each dot only once: 1, 2, 3, 4, 5. That's 5."* Never reworded by the
  LLM.
- **Four in a Row (K–1):** a wrong tap wobbles, the right spaces are outlined,
  and the hint is shown and spoken, e.g. *"Fourteen is 1 ten and 4 ones, so the
  1 comes first: 14."* Never reworded by the LLM.
- **Shut the Box (K–1):** hints are never reworded by the LLM and are read
  aloud. A wrong total gets Addition War's counting sentence; a wrong shut
  counts the picked tiles on, e.g. *"Start at 5 and count on: 6, 7, 8, 9. 5
  and 4 make 9. You need 8."*
- **Fraction Spoons:** hints are never reworded by the LLM (live rewordings
  of its size relations failed the fact check or read misleadingly). "Show
  me why" draws the Collecting card and the card the hint is about as two
  fraction bars of the same length, each cut into its parts, with a dashed
  line where the Collecting card's shading ends: equal fractions reach it,
  2/3 passes 1/2. The server picks both cards, so the picture always matches
  the sentence.
- **The 24 Game:** hints are never reworded by the LLM (a moved parenthesis
  changes the math). A wrong check always lists its steps by the rule; "Show
  me why" adds the rule that was missed and the parentheses that make the
  student's order work, e.g. *"In 3 + 5 × 3 × 1, × and ÷ come before + and −,
  so it makes 18. Parentheses show the order you used: (3 + 5) × 3 × 1 = 24."*

## The move engine (games against Robo)

Curriculum games register in `backend/curriculum/` and provide `new_round`,
`visible_state`, `evaluate_move`, `computer_move`, `hint_sentence` and a
general hint, and optionally `hint_cards` for a hint picture. The server keeps
each round (so hidden cards never reach the browser) and logs every graded move
with its diagnosis; a move the game marks
as not graded (`MoveResult.counted`, e.g. arranging cards) is applied but not
logged:

- `POST /curriculum/{game_id}/rounds` — start a round at the student's level
- `POST /rounds/{round_id}/moves` — evaluate, log and answer a move (422 for a
  move the game rejects, which is not logged)
- `POST /rounds/{round_id}/hint` — hint for the round's latest move, with the
  two cards the hint compares when the game provides them

The session summary counts workshop attempts and moves together, per game.

## For students

- Grade-band picker on first visit; every game stays playable.
- Large tap targets (64 px), AAA text contrast (`npm run check:contrast`),
  read-aloud buttons, soft sound effects with a mute switch, reduced motion
  respected, and an on-screen keypad for grades 2–3 (always shown in For
  Keeps).
- **K–1 games:** card and picture taps only, no typing; each step's words are
  spoken automatically once the browser allows it, with a "Hear it again"
  button; after answering, the hint, winner buttons and Next sit beside the
  answer cards so nothing falls below the table.
- **Game-table design:** games are played on a felt table with real-looking
  digit cards; the home screen is a set of grade-band shelves of games against
  Robo, with the skill workshops in their own space below them.
  Animation is used only for the math itself (the carry/borrow badge) and
  short feedback cues.

## Tech stack

- **Backend:** FastAPI + Pydantic, SQLite (attempts, rounds, moves)
- **Frontend:** React + Vite + Tailwind, React Router; Vitest + Testing Library
- **Diagnosis, dealing, tiering, hint sentences:** pure Python, no LLM
- **Hint rewording:** Qwen2.5-7B-Instruct via Hugging Face's
  `InferenceClient` (`featherless-ai` provider)

## Project layout

```
backend/
  games/                         skill workshops
    subtraction/ addition/ multiplication/ division/
      problems.py        problem generator, levels, validation
      misconceptions.py  buggy-procedure simulators and diagnose()
      sentences.py       code-built hint sentence per misconception
      hints.py           rewording prompt, banned words, general hint
    hint_check.py        rules an LLM rewording must pass
    rewording.py         LLM call with a 4-second total deadline
  curriculum/                    games against Robo
    engine.py            MoveResult and the game contract
    decimal_war/         rounds.py, misconceptions.py, moves.py,
                         sentences.py, hints.py (+ tests)
    for_keeps/           the same files: dealing, two-digit detectors,
                         moves and Robo, hint sentences (+ tests)
    card_war/            shared Addition War / Take-Away War rules: the
                         same files, with answer cards from mistakes
    addition_war/        fixes card_war to adding for the engine
    take_away_war/       fixes card_war to taking away for the engine
    coordinate_battleship/ the same files: fleets, pair detectors in both
                         directions, moves and hunting Robo, hints
    dont_break_the_bank/ the same files: column-by-column carrying and
                         borrowing simulators, dealing, moves and a
                         look-ahead Robo, hints
    cover_the_number/    the same files: rolls and scattered dots made in
                         advance, counting detectors, moves and Robo, hints
    four_in_a_row/       the same files: board of sums and mistake numbers,
                         teen-reversal detector (reusing card_war's), lines
                         and a blocking Robo, hints
    shut_the_box/        the same files: dealing with rolls made in advance,
                         total and shut detectors (reusing card_war's),
                         moves and Robo, hints
    clock_match/         the same files: reading and setting detectors, time
                         and clock choices, moves, hints
    target_number/       the same files: step and equation detectors, a
                         way finder for dealing and Robo, moves, hints
    volume_builder/      the same files: box detectors for counting and
                         building, levels, moves and Robo, hints
    fraction_spoons/     the same files: dealing with mistake cards,
                         fit and claim detectors, moves and Robo, hints
    twenty_four/         expressions.py (work out tokens under any order),
                         the same files: solver and dealing, detectors,
                         moves and Robo, hints
  catalog.py             each game's grade band, for shelving and suggesting
  recommend.py           the home screen engine: tile states and what to play next
  tiering.py             adaptive levels
  db.py                  SQLite: attempts, rounds, moves, summary
  main.py                FastAPI routes
frontend/src/
  pages/                 LandingPage, PracticePage, DecimalWarPage, ForKeepsPage,
                         CardWarPage, ShutTheBoxPage, FourInARowPage,
                         CoverTheNumberPage,
                         DontBreakTheBankPage,
                         TargetNumberPage, ClockMatchPage,
                         MultiplicationShootoutPage, FractionSpoonsPage,
                         TwentyFourPage, CoordinateBattleshipPage,
                         VolumeBuilderPage, DashboardPage
  intros/                every game's intro: pitch, demo captions and try-it,
                         with the demo tables in *Scenes.tsx
  components/            DigitChip, Keypad, AnswerBox, PlayingCard, GameTable,
                         ProgressMeter, HundredthsGrid, FractionCard, DiceFace,
                         FractionBars, CubeBox, DotCard, ClockFace, ...
  regroup.ts             borrow/carry animation steps
  expressionEntry.ts     which 24 Game tile can be tapped next
  wobble.ts              the K–1 wrong-tap wobble
```

## Running locally

**Backend**
```
cd backend
uv sync
uv run uvicorn main:app --port 8000
```
Hints work without any setup (students see the code-built sentences). To
enable LLM rewording, add a Hugging Face token to `backend/.env`:
```
HF_TOKEN=your_token_here
```

**Frontend**
```
cd frontend
npm install
npm run dev
```
Then open http://localhost:5173.

**Test on your phone** (phone on the same Wi-Fi as the laptop)
```
cd backend
uv run uvicorn main:app --host 0.0.0.0 --port 8000
```
```
cd frontend
npm run dev -- --host
```
Open the "Network" address Vite prints (e.g. `http://192.168.1.23:5173`) on
the phone. The frontend calls the API on the same host automatically. Windows
may ask to allow Python and Node through the firewall the first time.

**Hosted deployment:** build the frontend with `VITE_API_URL` set to the
backend's URL, and set `ALLOWED_ORIGINS` on the backend to the frontend's URL
(comma-separated for more than one).

**Tests and checks**
```
cd backend
uv run pytest
```
```
cd frontend
npm test
npm run check:contrast
npm run check:tap-targets
```
