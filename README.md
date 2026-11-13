# Peach State driving study

A standalone Georgia DDS knowledge-test study app with 330 original practice questions: 256 road rules and 74 visual signs, signals, and markings.

Open `dist/index.html` directly in a browser, or deploy `dist` to a static host. No build dependencies, account, or server are required. The hosted and offline copies use separate browser storage. Export and import a JSON backup to transfer progress.

Features: multiple-choice practice, self-rated flashcards, due review, mistake queue, saved session resume, searchable question library, 40-question exams with independent 15/20 passing requirements, progress export/import, and a downloadable offline copy.

A missed card clears the mistake queue after correct recall on two separate UTC days. Review intervals are 1, 3, 7, 14, then 30 days. Same-day repetition does not increase the recall streak. A mistake resets the streak and makes the card due immediately. Flashcard ratings count as self-reported correctness. Exam results update study records only after submission.

## Sources

Checked November 13, 2026:

- https://dds.georgia.gov/drivers-manual (currently labeled 2023 to 2024)
- https://dds.georgia.gov/testing-and-training/test-and-exams-information
- https://dds.georgia.gov/section-9-continued-sharing-road
- https://www.gahighwaysafety.org/hands-free-law/
- https://www.gahighwaysafety.org/seat-belt-laws/
- https://consumer.georgia.gov/child-car-seats
- https://dds.georgia.gov/georgia-licenseid/violations-suspensions-revocations/violations-and-suspensions-faqs/reinstatement

Questions and distractors are original study material. Illustrations are from the official DDS manual and retain their original appearance. This is an independent study aid, not an official DDS exam bank. Broad manual coverage does not guarantee every possible test question. Current official instructions take precedence.

## Build and checks

`python3 build_bank.py` compiles the editable question sources into `dist/questions.json`. The downloaded DDS manual snapshot under `sources` is needed to resolve image paths. `python3 build_bank.py --download` also fetches illustrations. `python3 build.py` embeds the bank, all artwork, styles, and application code into one offline-capable `dist/index.html`.

`node --test test-core.cjs` checks content integrity, review logic, independent exam scoring, backups, and packaging. `node test-dom.cjs` exercises application flows using LinkeDOM installed separately in `/private/tmp/georgia-study-qa`. No browser automation or visual browser testing was performed, at the user's request.

Source files live in `src`; editable questions live in `sources/rules.txt` and `sources/signs.txt`. Browser progress is never part of the source or deployment.
