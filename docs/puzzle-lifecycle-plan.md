# Puzzle Lifecycle, Persistence, and Sharing Plan

## Purpose

Sudoku Note is primarily a personal tool for copying an existing Sudoku or variant Sudoku
into the site and then solving it with the site's candidate and highlighting tools. This plan
adds a clear puzzle lifecycle, a completion timer, browser-local recovery, and portable puzzle
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

The site opens in Setup when there is no locally restored session or shared/imported puzzle.

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

### Persistence and portability

Persistence is local to the browser. There are no accounts, server-side records, or cloud sync in
this plan.

Puzzle definition and solve session are conceptually separate because they have different uses:

- A **puzzle definition** contains fixed clues and, later, variant constraints.
- A **solve session** contains solver entries, notes/highlights, elapsed time, and lifecycle phase.

Only serializable domain data belongs in the stored format. Do not store DOM elements, measured
widths/heights, hover state, or other transient rendering details.

### Import, export, and share links

Exports and share links contain the puzzle definition only. They must not include solver answers,
notes, highlights, elapsed time, completion state, theme, or other personal settings.

The expected share-link shape is a versioned, encoded definition in the URL fragment:

```text
https://example.com/#p=encoded-puzzle-definition
```

Start with a readable and reliable versioned encoding. Add compression only if real puzzle links
become unwieldy. File export remains the fallback for definitions too large for practical links.

## Explicit non-goals

The following are intentionally outside this plan:

- User accounts, authentication, or cloud synchronization
- Server-side puzzle storage
- A locally saved multi-puzzle library
- Bundled example puzzles or other public-facing onboarding
- Puzzle uniqueness or solvability checking
- Blocking validation during Setup
- Implementing variant-constraint editing tools
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

### Phase 5: Puzzle-definition import and export

Add portable files for puzzle definitions.

Scope:

- Export the current puzzle definition in the versioned format from Phase 3.
- Import a supported puzzle-definition file.
- Validate before replacing current state.
- Confirm before replacing a meaningful current session.
- Load imported definitions without solver progress and make them ready to begin solving.

Acceptance criteria:

- Export excludes solver entries, annotations, timer, phase, and personal settings.
- Export followed by import recreates the same clues and supported definition data.
- Invalid and unsupported files produce a useful error without altering current state.
- Canceling replacement preserves the current session.
- Import works without network access or a backend.

### Phase 6: Shareable puzzle links

Add backend-free sharing of puzzle definitions.

Scope:

- Encode the Phase 3 puzzle definition into a versioned URL fragment.
- Generate a copyable share URL.
- Decode and validate a shared definition on page load.
- Confirm before replacing a meaningful current session.
- Provide a useful failure state for corrupt, unsupported, or impractically large payloads.
- Use file export as the documented fallback for oversized definitions.

Acceptance criteria:

- Opening a generated link reconstructs the same puzzle definition.
- Links never contain solver progress, notes, elapsed time, completion state, or settings.
- Invalid link data cannot partially mutate the current puzzle or execute arbitrary content.
- The feature works on static hosting and requires no database.
- Existing local sessions are not silently overwritten by opening a link.
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
- [ ] Phase 3: Versioned serialization
- [ ] Phase 4: Local current-session restoration
- [ ] Phase 5: Puzzle-definition import and export
- [ ] Phase 6: Shareable puzzle links

## Current handoff

- **Current phase:** Phase 3 is ready to begin. Phase 2 is implemented but remains uncommitted for
  review.
- **Last completed phase:** Phase 2: Completion and timer.
- **Timer policy:** Count active, visible Solving time only. Hidden and closed intervals do not
  count; a restored Solving session should resume from its serialized accumulated elapsed time.
- **Known architectural context:** `src/lib/App2.svelte` owns the timer's accumulated active time,
  current visible segment, interval, and completion transition. `src/lib/puzzleLifecycle.ts`
  contains pure standard-Sudoku completion and elapsed-formatting functions. Completion reads only
  effective filled values, so candidate annotations cannot affect it. Completed values are locked,
  and `returnToSetup` clears timer and completion state along with the Phase 1 solver reset.
- **Phase 3 serialization note:** Serialize accumulated elapsed solve time and lifecycle phase, but
  exclude runtime timing fields such as the active `performance.now()` baseline and interval ID.
  The live-timer visibility toggle is a personal display preference rather than puzzle-definition
  or solve-session data. A serialization snapshot taken during active Solving should first account
  for the current visible segment rather than relying on the most recent 250 ms display tick.
- **Phase 2 verification:** `npm run check`, `npm run test:e2e` (50 tests), and `npm run build` pass.
  Playwright covers active/hidden timing, hour formatting, valid and invalid full grids,
  candidate-independent completion, one-time overlay behavior, frozen completed time, dialog
  focus, reset from Completed, and live timer layout checks at wide, side, and stacked/phone sizes.
  The changed files pass Prettier. Repository-wide `npm run lint` remains blocked at its Prettier
  gate by the same six pre-existing files recorded after Phase 1: `package.json`,
  `playwright.config.ts`, `README.md`, `src/app.html`, `src/lib/gridUtils.ts`, and
  `src/routes/+page.svelte`. The new lifecycle utility and test pass ESLint directly; the touched
  Svelte components retain three pre-existing ESLint findings (one unused import and two unused
  Svelte-ignore comments).
- **Scope guard:** Do not start optional public-facing features, a puzzle library, cloud storage,
  accounts, or concrete variant tools as part of these phases.

## Prompt for a new implementation chat

Replace the phase number as work progresses:

```text
Read docs/puzzle-lifecycle-plan.md completely, then inspect the current implementation and git
status.

Implement Phase 1 only. Do not start or partially implement any later phase.

Preserve existing behavior except where Phase 1 explicitly changes it. Add or update tests for
the phase's acceptance criteria, run the relevant tests, and check the affected responsive
layouts.

Do not commit yet. When finished, update the plan's phase status and current handoff, then
summarize:
- what changed
- what you tested
- any decisions or discoveries that affect later phases
- anything you could not verify
```
