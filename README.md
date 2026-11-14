# Peach State driving study

Live app: https://georgia-driving-study.vercel.app/

Source: https://github.com/moriowen/georgia-driving-study

A standalone Georgia DDS knowledge-test study app with 330 original practice questions: 256 road rules and 74 visual signs, signals, and markings.

Open `dist/index.html` directly in a browser, or deploy `dist` to a static HTTPS host. The hosted app is an installable PWA with a service worker that caches the full embedded question bank, images, manifest, and icons. No build dependencies, account, or server are required. The hosted and offline copies use separate browser storage. Export and import a JSON backup to transfer progress.

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

## Phone and offline use

Open the hosted app while online and wait for **Ready offline · all 330 questions saved**. On iPhone, use Safari > Share > Add to Home Screen. On Android, use Chrome > menu > Install app / Add to Home screen. Open the installed app once while connected and wait for the ready message there too. After that, it can open and save study progress without internet. Device or browser storage cleanup can remove cached files and history, so export backups periodically.

`node --test test-offline.cjs` tests service-worker installation, offline navigation and image retrieval, cache isolation, readiness reporting, and installation failures without a browser. Actual device installation was not tested.

Vercel hosts the app at its own standalone domain and is connected to the GitHub repository. To publish changes: run `python3 build.py`, run the code checks, commit the source and built `dist` files, then push `main`. Vercel serves `dist` with no remote build dependencies. For a manual production deployment, run `npx vercel --prod`.

If you previously studied on the private Sites version, export progress there and import it on the Vercel app. Different origins do not share local storage.

Progress from any previous hostname must be exported there and imported into the Vercel app, since browser storage is scoped to each origin.

## Revised question bank

Revision 2 reviews all 330 items, replaces 328 answer sets, and rewrites 113 question stems with more specific situations and explanations. Wrong choices use common confusions such as median versus turn-lane separation, flashing versus steady signals, and similar legal distances. The question count remains 256 rules and 74 visual signs/signals/markings. These are original practice items; their actual exam difficulty is not calibrated or guaranteed.

Question IDs are stored in `sources/question_ids.json` so wording changes retain history. Revision changes clear an unfinished session instead of grading old choices against new wording. Existing progress remains, and past exams are labeled Earlier bank. Build commands also work from the tracked image URL registry if the untracked DDS HTML snapshot is absent.

The Practice exam page includes the official two-section cutoff and DDS test-day procedure details. For an installed offline copy, open it online to download the update, then close and reopen it. The home page will say Revised bank.
