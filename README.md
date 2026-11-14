# Peach State driving study

Live app: https://georgia-driving-study.vercel.app/

Source: https://github.com/moriowen/georgia-driving-study

A standalone Georgia DDS knowledge-test study app with 330 original practice questions: 256 road rules and 74 visual signs, signals, and markings.

Open `dist/index.html` directly in a browser, or deploy `dist` to a static HTTPS host. The hosted app is an installable PWA with a service worker that caches the full embedded question bank, images, manifest, and icons. No build dependencies or study-app account are required. Optional cloud sync uses Supabase; no custom server is deployed. The hosted and offline copies use separate browser storage. Export and import a JSON backup to transfer progress.

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

If you previously studied on another hostname, connect both copies with the same private link if they support sync, or export the older progress and import it into the Vercel app. Different origins do not share local storage.

An installed home-screen app may have separate storage from the phone browser. Connect that installed copy too, under Progress & backup.

## Revised question bank

Revision 2 reviews all 330 items, replaces 328 answer sets, and rewrites 113 question stems with more specific situations and explanations. Wrong choices use common confusions such as median versus turn-lane separation, flashing versus steady signals, and similar legal distances. The question count remains 256 rules and 74 visual signs/signals/markings. These are original practice items; their actual exam difficulty is not calibrated or guaranteed.

Question IDs are stored in `sources/question_ids.json` so wording changes retain history. Revision changes clear an unfinished session instead of grading old choices against new wording. Existing progress remains, and past exams are labeled Earlier bank. Build commands also work from the tracked image URL registry if the untracked DDS HTML snapshot is absent.

The Practice exam page includes the official two-section cutoff and DDS test-day procedure details. For an installed offline copy, open it online to download the update, then close and reopen it. The home page will say Revised bank.

## Automatic Supabase sync

Open the same private connection link on your phone and laptop once. No sign-up or login is used. The link contains a random 256-bit shared capability in its URL fragment; the app removes that fragment from the address bar and remembers the key locally. Anyone with the link can read and update the one shared history. Do not publish or commit that link.

The deployed `src/sync-config.json` contains only the project URL and browser-safe publishable API key. Supabase has private, RLS-enabled history/settings tables with no anonymous table grants. A restricted SQL RPC verifies the SHA-256 hash of the private connection key before accepting or returning events. Management tokens, database passwords, secret API keys, and the private connection key are not shipped in the public app.

Answers and completed exams sync after a short debounce, on reopening/reconnecting, and about every 30 seconds while the app is visible. Offline answers are persisted as immutable events and uploaded on reconnect. Unique event IDs prevent retry duplication; both devices replay the same merged history. An unfinished quiz/exam stays on its current device. Free-project pausing can temporarily stop cloud sync, but local study remains available.

Existing pre-sync records are migrated as baseline snapshots. Because an old aggregate cannot identify overlapping past attempts, the most complete prior record per question is retained rather than adding snapshots together. Every answer recorded after migration merges individually. Backups include event history but omit connection credentials. New-format backups merge; restoring an older backup while connected or resetting progress requires confirmation and propagates to connected devices.

`node --test test-sync.cjs` tests two-device merging, offline queues, lost-reply retries, reload, baseline migration, reset propagation, invalid keys, backups, concurrent tabs, and invalid events. `node test-dom-sync.cjs` exercises the actual app integration using a simulated remote service. The LinkeDOM dependency is the same temporary QA installation used by `test-dom.cjs`.

Database schema: `supabase/sync.sql`. To configure it, `node scripts/configure-sync.mjs <PAT-secret-file> <project-ref>` uses a short-lived project-scoped token with Database read-write permission. It creates or reuses a private pairing key outside this repository at `/private/tmp/georgia-driving-sync-key`; keep the current private link for pairing devices. Rerunning setup without that key file rotates the connection key. The setup token can be revoked afterward without affecting app sync.
