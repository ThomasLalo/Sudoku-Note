# Puzzle Lifecycle, Persistence, and Sharing Plan

## Purpose

Sudoku Note is primarily a personal tool for copying an existing Sudoku or variant Sudoku
into the site and then solving it with the site's candidate and highlighting tools. This plan
adds a clear puzzle lifecycle, a completion timer, browser-local recovery, and shareable puzzle
definitions without introducing accounts or cloud storage.

This document is the durable handoff between implementation chats. Each chat should implement
only one phase, update the status and handoff notes, and leave later phases untouched.

## Product decisions

### Puzzle lifecycle

The application has three phases:

1. **Setup**: Enter and edit clues. In the future, this is also where variant constraints will
   be created.
2. **Solving**: Setup digits are fixed clues, solving tools are available, and the timer runs.
3. **Completed**: The completed time is frozen and a completion overlay is shown.

The site opens in Setup when there is no locally restored session or shared puzzle.

### Setup behavior

Setup initially provides:

- The number keypad
- **Erase clue**
- A **Show candidates** toggle, off by default
- **Start solving**

Candidate visibility in Setup is a display preference. When visible, candidates should reflect
the clues currently entered. Solver annotation tools such as Crossout, Add, Bold, Reveal, and
highlighting are not shown in Setup.

Starting a solve requires confirmation. Suggested copy:

> **Start solving?**
>
> The current digits will become fixed clues and the solve timer will begin.

The actions are **Cancel** and **Start solving**. Setup validation must not block this transition.
The user is responsible for copying a valid puzzle. Existing conflict highlighting may remain
available, but uniqueness, solvability, clue-count, and variant setup validation are deferred.

### Clues and solving entries

The application must distinguish digits entered during Setup from digits entered during Solving.
The exact internal representation is an implementation decision, but it must make these
invariants straightforward:

- Setup digits become fixed clues when solving starts.
- Fixed clues are visually distinguishable from solver-entered digits.
- Fixed clues cannot be overwritten or deleted in Solving.
- Solver-entered digits remain editable.
- Candidate calculations use the effective value of either kind of digit.
- Returning to Setup removes solver state without losing the original clues.

This distinction is in-memory application state and serializable browser data. It does not imply
a server or database.

### Edit puzzle

**Edit puzzle** is available from Solving and Completed. It requires confirmation because it
discards the current solve session.

Suggested copy:

> **Return to Setup?**
>
> Your solving progress and current time will be cleared.

Returning to Setup preserves the original clues and any future variant constraints, makes the
clues editable again, and discards:

- Solver-entered digits
- Candidate edits and solving highlights
- Solving-only selections or tool state as appropriate
- Timer progress
- Completed status

### Timer

The timer's primary purpose is to record the time shown in the completion overlay. Live display
is secondary.

- It starts only after **Start solving** is confirmed.
- It stops when the puzzle enters Completed.
- It runs whether or not it is visible.
- Live timer visibility is off by default and controlled from Info.
- It must not take persistent space from phone keypad layouts.
- The completion overlay always shows the final time, regardless of the live visibility setting.
- Format elapsed time as `MM:SS`, adding hours when needed.

Elapsed time counts only while the puzzle is in Solving and the page is visible. Hiding the page
pauses the timer, and making it visible resumes from the accumulated active time. Closing or
reloading the page also pauses elapsed time: when local restoration is added in Phase 4, a restored
Solving session must resume from its saved elapsed value without adding the closed interval. Open
page timing uses a monotonic clock so system clock changes do not alter the solve time.

### Completion

Completion is automatic and can occur only during Solving. Initially, completion means:

- Every cell is filled.
- The filled values satisfy the standard row, column, and box rules the application understands.

Setup validity is not a prerequisite. Candidate annotations must not affect completion validity.
As concrete variant tools are added later, their rules can participate in completion validation;
this plan does not require a generic variant validator in advance.

When completion is first detected:

- Freeze elapsed time before showing UI.
- Enter Completed exactly once.
- Show a congratulatory overlay containing the final time.
- Allow **View puzzle** to dismiss the overlay without restarting the timer.
- Allow **Edit puzzle** through the destructive confirmation described above.

A full but invalid grid remains in Solving and uses the application's normal conflict feedback.
It should not repeatedly open an error dialog.

### Persistence and sharing

Persistence is local to the browser. There are no accounts, server-side records, or cloud sync in
this plan.

Puzzle definition and solve session are conceptually separate because they have different uses:

- A **puzzle definition** contains fixed clues and, later, variant constraints.
- A **solve session** contains solver entries, notes/highlights, elapsed time, and lifecycle phase.

Only serializable domain data belongs in the stored format. Do not store DOM elements, measured
widths/heights, hover state, or other transient rendering details.

Local restoration and share links are independent features built on the same serialization
boundary:

- Local restoration preserves the puzzle definition and private solve session so work can resume.
- A share link contains only the puzzle definition so another browser starts a fresh session.

Share links do not replace local persistence, and local persistence is not a prerequisite for
encoding or decoding a link. When a shared definition is loaded, the existing local-persistence
feature can subsequently preserve the new solve session.

### Share links

Share links contain the puzzle definition only. They must not include solver answers, notes,
highlights, elapsed time, completion state, theme, or other personal settings.

The expected share-link shape is a versioned, encoded definition in the URL fragment:

```text
https://example.com/#p=encoded-puzzle-definition
```

The URL codec must be versioned separately from the puzzle-definition schema so either can evolve
without being confused with the other. Start with a readable and reliable encoding for the current
clue-only definition and enforce a practical payload-size limit. If a payload is too large, fail
safely with a useful message rather than producing an unreliable link.

Real variant-constraint formats should be measured with deliberately dense representative puzzles
when they are added. Add compression when those measurements justify it. Puzzle-definition file
import/export is deferred rather than required as an oversized-link fallback.

## Explicit non-goals

The following are intentionally outside this plan:

- User accounts, authentication, or cloud synchronization
- Server-side puzzle storage
- A locally saved multi-puzzle library
- Bundled example puzzles or other public-facing onboarding
- Puzzle uniqueness or solvability checking
- Blocking validation during Setup
- Implementing variant-constraint editing tools
- Puzzle-definition file import/export
- Premature URL compression or a generalized migration framework

These can be reconsidered in response to an actual personal need or user demand.

## Implementation phases

### Phase 1: Lifecycle and clue locking

Implement only the Setup/Solving foundation.

Scope:

- Add Setup, Solving, and Completed as explicit application phases, without implementing the
  completion transition yet.
- Open new puzzles in Setup.
- Distinguish setup clues from solver entries.
- Render fixed clues distinctly and prevent their modification in Solving.
- Provide the Setup keypad, Erase clue, Show candidates, and Start solving controls.
- Hide solving-only tools in Setup and restore them in Solving.
- Add the Start solving confirmation and transition behavior.
- Add Edit puzzle and its confirmation/reset behavior.
- Preserve keyboard, pointer selection, responsive layout, and candidate behavior unless this
  phase explicitly changes them.

Acceptance criteria:

- Setup digits can be entered, replaced, and erased.
- Setup candidates can be shown and hidden, and default to hidden.
- Canceling Start solving changes nothing.
- Confirming Start solving locks all current digits as clues.
- Locked clues cannot be overwritten or deleted by keyboard or pointer input.
- Digits entered after the transition remain editable solver entries.
- Solve tools are unavailable in Setup and available in Solving.
- Edit puzzle preserves clues, removes solver progress, clears timer/completion placeholders, and
  returns to Setup.
- Existing grid selection, multi-selection, candidate calculations, and responsive layouts still
  behave correctly.

### Phase 2: Completion and timer

Implement the timed Solving-to-Completed loop.

Scope:

- Settle and document hidden/closed-page timer semantics.
- Start, update, format, and stop elapsed time reliably.
- Add the Info preference for optional live timer visibility, off by default.
- Do not reserve persistent phone keypad space for the live timer.
- Implement a pure completion check based on filled values and standard Sudoku constraints.
- Keep candidate annotation validity separate from puzzle completion validity.
- Add the completion transition and accessible overlay.
- Preserve the frozen time after the overlay is dismissed.

Acceptance criteria:

- Setup time and confirmation-dialog time are excluded.
- The timer starts once when Solving begins and stops once on completion.
- Hiding the live timer does not stop it.
- The final elapsed time is always shown in the completion overlay.
- A full invalid grid does not complete.
- A full standard-valid grid completes exactly once.
- Candidate annotations cannot block an otherwise valid completion.
- View puzzle dismisses the overlay while keeping Completed and the final time.
- Edit puzzle from Completed follows the Phase 1 reset behavior.
- Keyboard focus is contained and restored appropriately around dialogs.

### Phase 3: Versioned serialization

Create a pure, tested serialization boundary without adding persistence UI.

Scope:

- Define a small versioned representation for a puzzle definition.
- Define a versioned representation for the current solve session.
- Convert between live application state and serialized data.
- Exclude transient rendering and interaction state.
- Validate parsed data before applying it to the application.
- Do not invent concrete variant constraint formats before variant tools exist; leave a clear,
  versionable extension point.

Acceptance criteria:

- Puzzle definitions survive a serialize/parse round trip.
- Solve sessions survive a serialize/parse round trip with their relevant annotations and timer.
- Runtime-only fields are absent from serialized output.
- Malformed data and unsupported versions fail safely without partially mutating live state.
- Restored data preserves clue-versus-entry identity.

### Phase 4: Local current-session restoration

Persist and recover one current session in browser storage.

Scope:

- Automatically save the current puzzle definition and solve session locally.
- Restore a valid saved session after reload or reopening the site.
- Apply the timer policy chosen in Phase 2.
- Add an explicit way to clear the current saved puzzle and begin fresh.
- Keep theme persistence independent from puzzle persistence.
- Do not add a saved-puzzle library.

Acceptance criteria:

- Refresh restores Setup, Solving, and Completed sessions accurately.
- Clues, solver entries, candidate annotations, elapsed time, and phase restore as intended.
- Corrupt, partial, or unsupported stored data does not crash the application.
- Clearing the saved puzzle removes only puzzle/session data, not unrelated preferences.
- Normal interaction remains responsive; storage writes are not performed wastefully on every
  timer-render tick.

### Phase 5: Shareable puzzle links

Add backend-free sharing of puzzle definitions.

Scope:

- Encode the Phase 3 puzzle definition into a versioned URL fragment.
- Keep the URL-codec version distinct from the puzzle-definition version.
- Generate a copyable share URL.
- Decode and validate a shared definition on page load.
- Confirm before replacing a meaningful current session.
- Provide a useful failure state for corrupt, unsupported, or impractically large payloads.
- Load a confirmed shared definition as a fresh Setup puzzle and allow Phase 4 persistence to save
  the resulting local session normally.

Acceptance criteria:

- Opening a generated link reconstructs the same puzzle definition.
- Links never contain solver progress, notes, elapsed time, completion state, or settings.
- Invalid link data cannot partially mutate the current puzzle or execute arbitrary content.
- The feature works on static hosting and requires no database.
- Existing local sessions are not silently overwritten by opening a link.
- An impractically large payload is rejected with a useful message and leaves current state intact.
- Compression is not added unless link size demonstrates a practical need.

## Verification expectations

Each phase should:

1. Inspect `git status` before editing and preserve unrelated user changes.
2. Add or update focused Playwright coverage for user-visible behavior.
3. Add focused tests for pure serialization logic when Phase 3 begins, using the smallest suitable
   test setup rather than introducing a large dependency solely for those tests.
4. Run the relevant targeted tests while iterating.
5. Before handoff, run:

   ```text
   npm run check
   npm run lint
   npm run test:e2e
   npm run build
   ```

6. Manually or through Playwright verify affected wide, side, and stacked/phone layouts.
7. Stop before committing so the user can review the diff, unless the user explicitly requests a
   commit.
8. Avoid beginning or partially scaffolding a later phase.

## Phase status

- [x] Product discussion and phased plan
- [x] Phase 1: Lifecycle and clue locking
- [x] Phase 2: Completion and timer
- [x] Phase 3: Versioned serialization
- [x] Phase 4: Local current-session restoration
- [x] Phase 5: Shareable puzzle links

## Current handoff

- **Current phase:** All planned phases are complete; Phase 5 is implemented and ready for review.
- **Last completed phase:** Phase 5: Shareable puzzle links.
- **History note:** Commit `a153548` is the Phase 2 timer/completion implementation even though its
  subject says "phase 3". Commit `a92079c` is the plan's Phase 3 serialization implementation, and
  commit `e63059f` is the accepted Phase 4 local-persistence implementation.
- **Timer policy:** Count active, visible Solving time only. Hidden and closed intervals do not
  count; a restored Solving session should resume from its serialized accumulated elapsed time.
- **Serialization format:** `src/lib/puzzleSerialization.ts` owns strict version 1 formats. A puzzle
  definition contains its format tag, version, and 81 row-major clues. A solve session contains its
  own format tag and version, lifecycle phase, elapsed milliseconds, 81 row-major solver entries,
  and sparse manual-add, crossout, and bold candidate annotations expressed as candidate digits.
  Clues and entries remain separate, so restoration preserves their identity.
- **Serialization boundary:** Parsing returns a discriminated success/error result with invalid
  JSON, invalid data, and unsupported versions distinguished. The combined deserializer validates
  the complete definition/session pair before constructing a fresh initialized grid, so failure
  cannot partially mutate the current grid. Setup data with solving progress, clue/entry overlap,
  and invalid Completed data are rejected. Calculated candidates are rebuilt from effective values.
- **Extension and exclusion decisions:** Version 1 intentionally has no variant-constraint field.
  Add a new supported puzzle-definition version after a concrete constraint domain exists rather
  than preserving unknown constraint data. Calculated candidates, DOM references, measurements,
  selection, tool state, layout/display preferences, the active `performance.now()` baseline, and
  the timer interval ID are excluded. This phase adds no storage, file portability, link, or other
  UI.
- **Phase 4 storage boundary:** `src/lib/puzzlePersistence.ts` owns the single
  `sudoku-note-current-puzzle` local-storage record. Its strict envelope contains only the Phase 3
  serialized puzzle-definition and solve-session strings. The app saves after serializable puzzle
  edits and lifecycle changes, plus visibility/page-hide boundaries; the 250 ms timer-render tick
  never writes storage. A snapshot of active Solving time is calculated at the write's current
  monotonic time.
- **Phase 4 restoration behavior:** Valid Setup, Solving, and Completed records replace the initial
  blank state atomically during mount. Solving resumes from saved accumulated active time with a new
  visible segment, so the closed interval is excluded. Completed restores its frozen time and
  reopens the completion overlay; overlay dismissal remains transient and is not a session field.
  Corrupt, partial, and unsupported envelopes are ignored without mutation or a crash. They are not
  proactively deleted, so unsupported future data is not destroyed merely by opening an older app;
  a later meaningful edit may replace it.
- **User preference storage:** `src/lib/userPreferences.ts` owns a separate, strict version 1
  `sudoku-note-user-preferences` record for Flipped notes, Show live timer, and Return to Reveal
  after edits. Dark Mode now appears with the other Info settings but continues to use the existing
  independent `theme` key as its sole source of persisted state; `src/app.html` applies that value
  before rendering. Setup candidate visibility, selection, active tools, open panels, and responsive
  layout state remain transient. Preferences never enter puzzle definitions, solve sessions, or
  share links.
- **Phase 4 clear behavior:** Settings now offers a confirmed **New puzzle** action in every phase.
  It resets the in-memory puzzle and removes only the current-puzzle storage key. Theme, the Info
  settings record, and other unrelated preferences remain untouched. A blank Setup is not stored,
  and erasing the final Setup clue removes a previously valid current-puzzle record. This remains
  one current session, not a saved-puzzle library.
- **Phase 4 verification:** `npm run check`, `npm run test:e2e` (63 tests), and `npm run build` pass.
  The focused persistence/lifecycle/mobile-layout run passes 21 tests. Playwright covers Setup,
  Solving, and Completed reloads; clue-versus-entry identity; candidate annotations; active/hidden
  timer behavior; storage-write frequency; invalid records; independent theme and versioned
  Info-setting restoration; preference-safe clearing; and wide, side, stacked/phone dialog layouts.
  The Phase 4 files pass Prettier and the new utility/test files pass ESLint directly.
  Repository-wide `npm run lint` remains blocked at its Prettier gate by five pre-existing files:
  `package.json`, `playwright.config.ts`, `README.md`, `src/lib/gridUtils.ts`, and
  `src/routes/+page.svelte`. Direct ESLint on touched existing files remains blocked by the
  pre-existing unused `getAdjacentCell` import in `src/lib/App2.svelte` and unused `grid` variable in
  `tests/sudoku-grid.spec.ts`.
- **Phase 5 URL codec:** `src/lib/puzzleSharing.ts` owns strict URL-codec version 1. The `#p=` value
  is UTF-8 JSON encoded as unpadded base64url. Its envelope contains only its own format/version and
  the serialized Phase 3 puzzle definition; the puzzle-definition version remains inside that
  serialized definition and can evolve independently. The encoded payload limit is 4,096
  characters. A fully filled current-schema definition produces a 404-character payload
  (407-character fragment), so compression is not justified for the clue-only format.
- **Phase 5 sharing behavior:** Settings offers **Share puzzle**, with a read-only URL and clipboard
  action plus a manual-copy fallback. Solver entries, annotations, elapsed time, lifecycle phase,
  and settings never enter the codec. On page load, a valid shared definition is fully decoded and
  validated before application. It opens as a fresh Setup puzzle; a meaningful restored local
  session requires confirmation first. Accepting clears/replaces only current-puzzle data and then
  uses normal Phase 4 persistence. Canceling or acknowledging an invalid, unsupported, ambiguous,
  or oversized link preserves the current session. Consumed `p` fragments are removed with
  `history.replaceState` so reloads do not prompt again.
- **Phase 5 verification:** `npm run check`, `npm run test:e2e` (71 tests), and `npm run build` pass.
  The focused Phase 5 suite passes 8 tests, and the affected serialization/lifecycle/persistence/
  responsive-layout run passes 33 tests. Playwright covers definition-only codec round trips,
  clipboard output, fresh Setup loading and persistence, replacement confirmation/cancellation,
  atomic corrupt/unsupported/oversized failures, and dialog bounds in wide, side, and stacked phone
  layouts. The Phase 5 files pass Prettier, and the new codec/test plus serialization files pass
  ESLint directly. Repository-wide `npm run lint` remains blocked at its Prettier gate by the same
  five pre-existing files: `package.json`, `playwright.config.ts`, `README.md`,
  `src/lib/gridUtils.ts`, and `src/routes/+page.svelte`. Direct lint of `src/lib/App2.svelte`
  remains blocked only by its pre-existing unused `getAdjacentCell` import.
- **Future format decision:** Keep the readable uncompressed codec until concrete variant
  constraints exist. When they do, measure deliberately dense representative definitions against
  the 4,096-character limit before deciding whether a new codec version needs compression. File
  import/export remains deferred rather than becoming an oversized-link fallback.
- **Scope guard:** Do not start optional public-facing features, a puzzle library, cloud storage,
  accounts, or concrete variant tools as part of these phases.

## Prompt for a review chat

```text
Read docs/puzzle-lifecycle-plan.md completely, then inspect the current implementation and git
status.

Review the uncommitted Phase 5 implementation against the plan's scope and acceptance criteria.
Do not start or partially implement any deferred feature.

Verify the focused tests, repository gates, and affected responsive layouts. Preserve the existing
documentation-only edits in this plan.

Do not commit unless explicitly requested. When finished, summarize:
- what changed
- what you tested
- any decisions or discoveries that affect future work
- anything you could not verify
```
