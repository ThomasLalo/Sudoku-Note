<script lang="ts">
	import IsometricBorder from './IsometricBorder.svelte';
	import KeypadButton from './KeypadButton.svelte';
	import RadioButtons from './RadioButtons.svelte';
	import SudokuGrid from './SudokuGrid.svelte';
	import TextSwitch from './TextSwitch.svelte';
	import Delete from '@lucide/svelte/icons/delete';
	import Highlighter from '@lucide/svelte/icons/highlighter';
	import Pencil from '@lucide/svelte/icons/pencil';
	import PencilOff from '@lucide/svelte/icons/pencil-off';
	import Play from '@lucide/svelte/icons/play';
	import Redo from '@lucide/svelte/icons/redo';
	import Spotlight from '@lucide/svelte/icons/spotlight';
	import SquareArrowRight from '@lucide/svelte/icons/square-arrow-right';
	import Grid2x2Plus from '@lucide/svelte/icons/grid-2x2-plus';
	import Undo from '@lucide/svelte/icons/undo';
	import { onMount, tick } from 'svelte';
	import type { Cell } from './gridUtils';
	import { initializeGrid } from './gridUtils';
	import {
		calculateElapsedMilliseconds,
		formatElapsedTime,
		isStandardSudokuComplete
	} from './puzzleLifecycle';
	import {
		currentPuzzleStorageKey,
		decodeStoredPuzzleState,
		encodeStoredPuzzleState
	} from './puzzlePersistence';
	import {
		createPuzzleDefinition,
		serializePuzzleState,
		type PuzzlePhase,
		type RestoredPuzzleState
	} from './puzzleSerialization';
	import {
		createShareUrl,
		decodeSharedPuzzleFragment,
		type SharedPuzzleFragmentResult
	} from './puzzleSharing';
	import {
		createUserPreferences,
		parseUserPreferences,
		serializeUserPreferences,
		userPreferencesStorageKey
	} from './userPreferences';
	const keypadInts = [7, 8, 9, 4, 5, 6, 1, 2, 3];
	const flippedKeypadInts = [1, 2, 3, 4, 5, 6, 7, 8, 9];
	type LayoutMode = 'wide' | 'side' | 'stacked';
	type InfoSection = 'rules' | 'guide' | 'controls' | 'settings';
	const minimumKeySize = 32;
	const preferredKeySize = 64;
	const minimumUsefulGridSize = 270;
	const wideLayoutMinimumWidth = 1616;
	const shiftedNumpadReleaseGraceMilliseconds = 50;
	const maximumPuzzleEditHistoryEntries = 100;
	type KeypadMode =
		| 'Enter digit'
		| 'Reveal all candidates'
		| 'Crossout candidate'
		| 'Add candidate'
		| 'Bold candidate';
	type NumberInputSource = 'keyboard' | 'pointer';
	type PuzzleEditCellSnapshot = Pick<Cell, 'fillNumber' | 'isClue'> & {
		manuallyAddedCandidates: boolean[];
		crossedOutCandidates: boolean[];
		boldCandidates: boolean[];
	};
	type PuzzleEditSnapshot = {
		puzzlePhase: PuzzlePhase;
		cells: PuzzleEditCellSnapshot[];
	};
	const keypadModes: KeypadMode[] = [
		'Enter digit',
		'Reveal all candidates',
		'Crossout candidate',
		'Add candidate',
		'Bold candidate'
	];

	let displayedPanel = $state('Keypad');
	let puzzlePhase: PuzzlePhase = $state('setup');
	let openInfoSection: InfoSection | null = $state('guide');
	let darkMode = $state(false);
	let showSetupCandidates = $state(false);
	let showLiveTimer = $state(false);
	let startSolvingDialog: HTMLDialogElement;
	let editPuzzleDialog: HTMLDialogElement;
	let newPuzzleDialog: HTMLDialogElement;
	let completionDialog: HTMLDialogElement;
	let sharePuzzleDialog: HTMLDialogElement;
	let replaceSharedPuzzleDialog: HTMLDialogElement;
	let shareLinkErrorDialog: HTMLDialogElement;
	let shareUrlInput: HTMLInputElement;
	let appContainer: HTMLDivElement;
	let layoutMode: LayoutMode = $state('stacked');
	let gridSize = $state(300);
	let keySize = $state(minimumKeySize);
	let allowLayoutOverflow = $state(false);
	let infoPanelMaxHeight = $state('none');
	let layoutStyle = $derived(
		`--grid-size: ${gridSize}px; --key-size: ${keySize}px; --info-panel-max-height: ${infoPanelMaxHeight};`
	);
	let keypadMode: KeypadMode = $state('Enter digit');
	let shiftHeld = $state(false);
	let controlHeld = $state(false);
	let lastShiftReleaseAt = Number.NEGATIVE_INFINITY;
	let shiftedNumpadCode: string | null = null;
	let activeKeypadMode = $derived.by<KeypadMode>(() => {
		if (controlHeld) return 'Enter digit';
		if (shiftHeld) return 'Crossout candidate';
		return keypadMode;
	});
	let revealedNumber: number | null = $state(null);
	let flippedNotes = $state(false);
	let returnToRevealAfterEdits = $state(true);
	let multiSelect = $state(false);
	let gridState: Cell[][] = $state(initializeGrid());
	let undoHistory: PuzzleEditSnapshot[] = $state([]);
	let redoHistory: PuzzleEditSnapshot[] = $state([]);
	let canUndo = $derived(undoHistory.length > 0);
	let canRedo = $derived(redoHistory.length > 0);
	let selectedCells: Cell[] = $state([]);
	let lastSelected: Cell = $derived(gridState[0][0]);
	let gridStateRows: Cell[][] = $derived(reorganizeGrid(gridState)); // 0 based
	let gridStateCols: Cell[][] = $derived(
		gridStateRows[0].map((_, colIndex) => gridStateRows.map((row) => row[colIndex]))
	);
	let elapsedMilliseconds = $state(0);
	let formattedElapsedTime = $derived(formatElapsedTime(elapsedMilliseconds));
	let accumulatedActiveMilliseconds = 0;
	let activeTimerStartedAt: number | null = null;
	let timerUpdateId: ReturnType<typeof setInterval> | null = null;
	let reopenCompletionAfterEditCancel = false;
	let completionReturnFocus: HTMLElement | null = null;
	let restoreCompletionFocusOnClose = true;
	let lastSavedPuzzleStorageValue: string | null = null;
	let lastSavedUserPreferencesValue: string | null = null;
	let pendingSharedPuzzle: RestoredPuzzleState | null = null;
	let shareUrl = $state('');
	let shareCopyMessage = $state('');
	let shareLinkErrorTitle = $state('');
	let shareLinkErrorMessage = $state('');
	let shareLinkErrorIsIncoming = false;

	function reorganizeGrid(boxGrid: Cell[][]) {
		const rowGrid: Cell[][] = [[], [], [], [], [], [], [], [], []];
		for (const [boxIndex, box] of boxGrid.entries()) {
			// for each box of the grid
			if ([0, 1, 2].includes(boxIndex)) {
				// if the box is box 1,2, or 3, but 0 based
				rowGrid[0].push(...box.slice(0, 3)); // builds row 1 with [[1,1], [1,2], [1,3]],..
				rowGrid[1].push(...box.slice(3, 6)); // builds row 2
				rowGrid[2].push(...box.slice(6, 9)); // builds row 3
			}
			if ([3, 4, 5].includes(boxIndex)) {
				// boxes 4,5,6
				rowGrid[3].push(...box.slice(0, 3)); // 4
				rowGrid[4].push(...box.slice(3, 6)); // 5
				rowGrid[5].push(...box.slice(6, 9)); // 6
			}
			if ([6, 7, 8].includes(boxIndex)) {
				// boxes 7,8,9
				rowGrid[6].push(...box.slice(0, 3)); // 7
				rowGrid[7].push(...box.slice(3, 6)); // 8
				rowGrid[8].push(...box.slice(6, 9)); // 9
			}
		}
		return rowGrid; // 0 based
	}

	function getSeenCells(originCell: Cell) {
		// take box, row, and col and put them in a Set which removes duplicates, and convert the set back to an array
		const visibleCells: Cell[] = [
			...new Set([
				...gridState[originCell.boxNumber - 1],
				...gridStateRows[originCell.rowNumber0based],
				...gridStateCols[originCell.colNumber0based]
			])
		];
		return visibleCells;
	}

	function cellCanBeEdited(targetCell: Cell) {
		return puzzlePhase === 'setup' || (puzzlePhase === 'solving' && !targetCell.isClue);
	}

	function clearTimerUpdates() {
		if (timerUpdateId === null) return;
		clearInterval(timerUpdateId);
		timerUpdateId = null;
	}

	function refreshElapsedTime(now = performance.now()) {
		elapsedMilliseconds = calculateElapsedMilliseconds(
			accumulatedActiveMilliseconds,
			activeTimerStartedAt,
			now
		);
	}

	function currentElapsedSnapshot(now = performance.now()) {
		return puzzlePhase === 'solving'
			? calculateElapsedMilliseconds(accumulatedActiveMilliseconds, activeTimerStartedAt, now)
			: elapsedMilliseconds;
	}

	function hasMeaningfulPuzzleState() {
		return puzzlePhase !== 'setup' || gridStateRows.flat().some((cell) => cell.fillNumber !== null);
	}

	function persistCurrentPuzzle() {
		if (!hasMeaningfulPuzzleState()) {
			if (lastSavedPuzzleStorageValue === null) return;
			try {
				localStorage.removeItem(currentPuzzleStorageKey);
				lastSavedPuzzleStorageValue = null;
			} catch {
				// Browser storage can be unavailable; the in-memory puzzle should remain usable.
			}
			return;
		}

		try {
			const value = encodeStoredPuzzleState(
				serializePuzzleState(gridState, puzzlePhase, currentElapsedSnapshot())
			);
			if (value === lastSavedPuzzleStorageValue) return;

			localStorage.setItem(currentPuzzleStorageKey, value);
			lastSavedPuzzleStorageValue = value;
		} catch {
			// Saving must not interrupt puzzle interaction when storage is unavailable.
		}
	}

	function showRestoredCompletionOverlay() {
		void tick().then(() => {
			if (puzzlePhase !== 'completed' || completionDialog.open) return;
			completionReturnFocus = document.querySelector<HTMLElement>('.sudoku-grid');
			restoreCompletionFocusOnClose = true;
			completionDialog.showModal();
		});
	}

	function restoreCurrentPuzzle(showCompletionOverlay = true) {
		let storedValue: string | null;
		try {
			storedValue = localStorage.getItem(currentPuzzleStorageKey);
		} catch {
			return;
		}
		if (storedValue === null) return;

		const restored = decodeStoredPuzzleState(storedValue);
		if (!restored.ok) return;

		clearTimerUpdates();
		gridState = restored.value.gridState;
		puzzlePhase = restored.value.puzzlePhase;
		elapsedMilliseconds = restored.value.elapsedMilliseconds;
		accumulatedActiveMilliseconds = restored.value.elapsedMilliseconds;
		activeTimerStartedAt = null;
		lastSavedPuzzleStorageValue = storedValue;

		if (puzzlePhase === 'solving') {
			beginActiveTimerSegment();
		} else if (puzzlePhase === 'completed' && showCompletionOverlay) {
			showRestoredCompletionOverlay();
		}
	}

	function clearStoredPuzzle() {
		try {
			localStorage.removeItem(currentPuzzleStorageKey);
			lastSavedPuzzleStorageValue = null;
		} catch {
			// Beginning fresh should still work in memory if browser storage is unavailable.
		}
	}

	function applyTheme() {
		document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
	}

	function persistTheme() {
		try {
			localStorage.setItem('theme', darkMode ? 'dark' : 'light');
		} catch {
			// The selected theme remains active for the current page if browser storage is unavailable.
		}
	}

	function restoreTheme() {
		let savedTheme: string | null;
		try {
			savedTheme = localStorage.getItem('theme');
		} catch {
			return;
		}

		darkMode = savedTheme === 'dark';
		applyTheme();
	}

	function persistUserPreferences() {
		try {
			const value = serializeUserPreferences(
				createUserPreferences(flippedNotes, showLiveTimer, returnToRevealAfterEdits)
			);
			if (value === lastSavedUserPreferencesValue) return;

			localStorage.setItem(userPreferencesStorageKey, value);
			lastSavedUserPreferencesValue = value;
		} catch {
			// Preferences remain usable for the current page if browser storage is unavailable.
		}
	}

	function restoreUserPreferences() {
		let storedValue: string | null;
		try {
			storedValue = localStorage.getItem(userPreferencesStorageKey);
		} catch {
			return;
		}

		if (storedValue === null) return;

		const restored = parseUserPreferences(storedValue);
		if (!restored.ok) return;

		flippedNotes = restored.value.flippedNotes;
		showLiveTimer = restored.value.showLiveTimer;
		returnToRevealAfterEdits = restored.value.returnToRevealAfterEdits;
		lastSavedUserPreferencesValue = storedValue;
	}

	function beginActiveTimerSegment() {
		if (puzzlePhase !== 'solving' || document.hidden || activeTimerStartedAt !== null) return;

		activeTimerStartedAt = performance.now();
		refreshElapsedTime(activeTimerStartedAt);
		if (timerUpdateId === null) {
			timerUpdateId = setInterval(refreshElapsedTime, 250);
		}
	}

	function pauseActiveTimerSegment() {
		if (activeTimerStartedAt !== null) {
			const now = performance.now();
			accumulatedActiveMilliseconds += Math.max(0, now - activeTimerStartedAt);
			activeTimerStartedAt = null;
			elapsedMilliseconds = accumulatedActiveMilliseconds;
		}
		clearTimerUpdates();
	}

	function startSolveTimer() {
		clearTimerUpdates();
		accumulatedActiveMilliseconds = 0;
		activeTimerStartedAt = null;
		elapsedMilliseconds = 0;
		beginActiveTimerSegment();
	}

	function resetSolveTimer() {
		clearTimerUpdates();
		accumulatedActiveMilliseconds = 0;
		activeTimerStartedAt = null;
		elapsedMilliseconds = 0;
	}

	function handleVisibilityChange() {
		if (document.hidden) {
			pauseActiveTimerSegment();
			persistCurrentPuzzle();
		} else {
			beginActiveTimerSegment();
		}
	}

	function handlePageHide() {
		pauseActiveTimerSegment();
		persistCurrentPuzzle();
	}

	function handlePageShow() {
		beginActiveTimerSegment();
	}

	function completePuzzleIfValid() {
		if (puzzlePhase !== 'solving') return;

		const values = gridStateRows.map((row) => row.map((cell) => cell.fillNumber));
		if (!isStandardSudokuComplete(values)) return;

		pauseActiveTimerSegment();
		puzzlePhase = 'completed';
		revealedNumber = null;
		clearHeldModifiers();
		const activeElement = document.activeElement;
		completionReturnFocus =
			activeElement instanceof HTMLElement &&
			activeElement !== document.body &&
			activeElement.getClientRects().length > 0
				? activeElement
				: document.querySelector<HTMLElement>('.sudoku-grid');
		restoreCompletionFocusOnClose = true;
		completionDialog.showModal();
	}

	function fillCell(targetCell: Cell, fillValue: number) {
		if (!cellCanBeEdited(targetCell)) return;

		targetCell.fillNumber = fillValue;
		targetCell.isClue = puzzlePhase === 'setup';
		recalculateCandidates(getSeenCells(targetCell));
	}

	function recalculateCandidates(cells: Iterable<Cell>) {
		for (const cell of cells) {
			const seenCells = getSeenCells(cell);
			cell.candidates = keypadInts.map((candidate) =>
				seenCells.every((seenCell) => seenCell.fillNumber !== candidate)
			);
		}
	}

	function capturePuzzleEditSnapshot(): PuzzleEditSnapshot {
		return {
			puzzlePhase,
			cells: gridState.flat().map((cell) => ({
				fillNumber: cell.fillNumber,
				isClue: cell.isClue,
				manuallyAddedCandidates: [...cell.manuallyAddedCandidates],
				crossedOutCandidates: [...cell.crossedOutCandidates],
				boldCandidates: [...cell.boldCandidates]
			}))
		};
	}

	function booleanFlagsMatch(left: readonly boolean[], right: readonly boolean[]) {
		return left.length === right.length && left.every((flag, index) => flag === right[index]);
	}

	function puzzleEditSnapshotsMatch(left: PuzzleEditSnapshot, right: PuzzleEditSnapshot) {
		return (
			left.puzzlePhase === right.puzzlePhase &&
			left.cells.length === right.cells.length &&
			left.cells.every((cell, index) => {
				const otherCell = right.cells[index];
				return (
					cell.fillNumber === otherCell.fillNumber &&
					cell.isClue === otherCell.isClue &&
					booleanFlagsMatch(cell.manuallyAddedCandidates, otherCell.manuallyAddedCandidates) &&
					booleanFlagsMatch(cell.crossedOutCandidates, otherCell.crossedOutCandidates) &&
					booleanFlagsMatch(cell.boldCandidates, otherCell.boldCandidates)
				);
			})
		);
	}

	function appendBoundedHistory(
		historyEntries: PuzzleEditSnapshot[],
		snapshot: PuzzleEditSnapshot
	) {
		return [...historyEntries, snapshot].slice(-maximumPuzzleEditHistoryEntries);
	}

	function resetPuzzleEditHistory() {
		undoHistory = [];
		redoHistory = [];
	}

	function performPuzzleEdit(edit: () => void) {
		const before = capturePuzzleEditSnapshot();
		edit();
		if (puzzleEditSnapshotsMatch(before, capturePuzzleEditSnapshot())) return false;

		undoHistory = appendBoundedHistory(undoHistory, before);
		redoHistory = [];
		persistCurrentPuzzle();
		return true;
	}

	function applyPuzzleEditSnapshot(snapshot: PuzzleEditSnapshot) {
		const cells = gridState.flat();
		if (cells.length !== snapshot.cells.length) return;

		const previousPhase = puzzlePhase;
		for (const [index, cell] of cells.entries()) {
			const savedCell = snapshot.cells[index];
			cell.fillNumber = savedCell.fillNumber;
			cell.isClue = savedCell.isClue;
			cell.manuallyAddedCandidates = [...savedCell.manuallyAddedCandidates];
			cell.crossedOutCandidates = [...savedCell.crossedOutCandidates];
			cell.boldCandidates = [...savedCell.boldCandidates];
		}
		recalculateCandidates(cells);
		puzzlePhase = snapshot.puzzlePhase;

		if (previousPhase === 'completed' && puzzlePhase === 'solving') {
			if (completionDialog.open) {
				restoreCompletionFocusOnClose = false;
				completionDialog.close();
			}
			beginActiveTimerSegment();
		} else if (previousPhase === 'solving' && puzzlePhase === 'completed') {
			pauseActiveTimerSegment();
			clearHeldModifiers();
			showRestoredCompletionOverlay();
		}

		persistCurrentPuzzle();
	}

	function undoPuzzleEdit() {
		const previousSnapshot = undoHistory.at(-1);
		if (!previousSnapshot) return;

		redoHistory = appendBoundedHistory(redoHistory, capturePuzzleEditSnapshot());
		undoHistory = undoHistory.slice(0, -1);
		applyPuzzleEditSnapshot(previousSnapshot);
	}

	function redoPuzzleEdit() {
		const nextSnapshot = redoHistory.at(-1);
		if (!nextSnapshot) return;

		undoHistory = appendBoundedHistory(undoHistory, capturePuzzleEditSnapshot());
		redoHistory = redoHistory.slice(0, -1);
		applyPuzzleEditSnapshot(nextSnapshot);
	}

	function clearCells(targetCells: Cell[]) {
		const editableCells = targetCells.filter(cellCanBeEdited);
		if (editableCells.length === 0) return;

		performPuzzleEdit(() => {
			const affectedCells = new Set(editableCells.flatMap((cell) => getSeenCells(cell)));
			for (const cell of editableCells) {
				cell.fillNumber = null;
				cell.isClue = false;
			}
			recalculateCandidates(affectedCells);
		});
	}

	function shiftWasHeldForNumpadInput(event: KeyboardEvent) {
		if (event.shiftKey || shiftHeld) return true;
		if (shiftedNumpadCode === event.code) return true;

		const isShiftTranslatedNumpadDigit =
			/^Numpad[1-9]$/.test(event.code) &&
			!/^[1-9]$/.test(event.key) &&
			event.getModifierState('NumLock');
		const millisecondsSinceShiftRelease = event.timeStamp - lastShiftReleaseAt;
		if (
			!isShiftTranslatedNumpadDigit ||
			millisecondsSinceShiftRelease < 0 ||
			millisecondsSinceShiftRelease > shiftedNumpadReleaseGraceMilliseconds
		) {
			return false;
		}

		shiftedNumpadCode = event.code;
		return true;
	}

	function handleKeypadNumber(
		fillValue: number,
		inputSource: NumberInputSource = 'keyboard',
		keyboardEvent?: KeyboardEvent
	) {
		const controlActive = keyboardEvent ? keyboardEvent.ctrlKey || controlHeld : controlHeld;
		const shiftActive = keyboardEvent ? shiftWasHeldForNumpadInput(keyboardEvent) : shiftHeld;
		const modeAtAction =
			puzzlePhase === 'setup'
				? 'Enter digit'
				: controlActive
					? 'Enter digit'
					: shiftActive
						? 'Crossout candidate'
						: keypadMode;
		const hasEditableSelectedCells = selectedCells.some(cellCanBeEdited);

		if (modeAtAction !== 'Reveal all candidates') {
			performPuzzleEdit(() => {
				if (modeAtAction === 'Enter digit') {
					for (const cell of selectedCells) {
						fillCell(cell, fillValue);
					}
					completePuzzleIfValid();
				} else if (modeAtAction === 'Crossout candidate') {
					const candidateIndex = keypadInts.indexOf(fillValue);
					for (const cell of selectedCells) {
						cell.crossedOutCandidates[candidateIndex] = true;
					}
				} else if (modeAtAction === 'Bold candidate') {
					const candidateIndex = keypadInts.indexOf(fillValue);
					for (const cell of selectedCells) {
						cell.boldCandidates[candidateIndex] = true;
					}
				} else if (modeAtAction === 'Add candidate') {
					const candidateIndex = keypadInts.indexOf(fillValue);
					for (const cell of selectedCells) {
						if (cell.fillNumber !== null) continue;

						cell.crossedOutCandidates[candidateIndex] = false;
						cell.boldCandidates[candidateIndex] = false;
						if (!cell.candidates[candidateIndex]) {
							cell.manuallyAddedCandidates[candidateIndex] = true;
						}
					}
				}
			});
		} else if (modeAtAction === 'Reveal all candidates') {
			revealedNumber = fillValue;
		}

		const shouldReturnToReveal =
			puzzlePhase === 'solving' &&
			returnToRevealAfterEdits &&
			inputSource === 'pointer' &&
			hasEditableSelectedCells &&
			!shiftHeld &&
			!controlHeld &&
			(modeAtAction === 'Enter digit' || modeAtAction === 'Crossout candidate');
		if (shouldReturnToReveal) {
			revealedNumber = fillValue;
			keypadMode = 'Reveal all candidates';
		}
	}

	function handleKeyboardNumber(fillValue: number, event: KeyboardEvent) {
		handleKeypadNumber(fillValue, 'keyboard', event);
	}

	function handleModifierKeyDown(event: KeyboardEvent) {
		if (handlePuzzleHistoryShortcut(event)) return;
		if (document.querySelector('dialog[open]') || puzzlePhase === 'setup') return;

		if (event.code === 'Space') {
			event.preventDefault();
			if (!event.repeat) {
				const nextModeIndex = (keypadModes.indexOf(keypadMode) + 1) % keypadModes.length;
				keypadMode = keypadModes[nextModeIndex];
			}
		}
		if (event.key === 'Shift') {
			shiftHeld = true;
			lastShiftReleaseAt = Number.NEGATIVE_INFINITY;
			shiftedNumpadCode = null;
		}
		if (event.key === 'Control') controlHeld = true;
	}

	function isTextEditingTarget(target: EventTarget | null) {
		if (target instanceof HTMLTextAreaElement) return true;
		if (target instanceof HTMLInputElement) {
			return !['button', 'checkbox', 'radio', 'reset', 'submit'].includes(target.type);
		}
		return target instanceof HTMLElement && target.isContentEditable;
	}

	function handlePuzzleHistoryShortcut(event: KeyboardEvent) {
		if (!(event.ctrlKey || event.metaKey) || event.altKey || isTextEditingTarget(event.target)) {
			return false;
		}

		const key = event.key.toLowerCase();
		if (key !== 'z' && key !== 'y') return false;
		const openDialog = document.querySelector<HTMLDialogElement>('dialog[open]');
		if (openDialog && openDialog !== completionDialog) return false;

		event.preventDefault();
		if (key === 'y' || event.shiftKey) {
			redoPuzzleEdit();
		} else {
			undoPuzzleEdit();
		}
		return true;
	}

	function handleModifierKeyUp(event: KeyboardEvent) {
		if (event.key === 'Shift') {
			lastShiftReleaseAt = event.timeStamp;
			shiftHeld = false;
		}
		if (event.code === shiftedNumpadCode) shiftedNumpadCode = null;
		if (event.key === 'Control') controlHeld = false;
	}

	function clearHeldModifiers() {
		shiftHeld = false;
		controlHeld = false;
		lastShiftReleaseAt = Number.NEGATIVE_INFINITY;
		shiftedNumpadCode = null;
	}

	function containDialogFocus(event: KeyboardEvent) {
		if (event.key !== 'Tab') return;

		const dialog = event.currentTarget as HTMLDialogElement;
		const focusableElements = Array.from(
			dialog.querySelectorAll<HTMLElement>('button:not(:disabled), [href], input:not(:disabled)')
		);
		const firstElement = focusableElements[0];
		const lastElement = focusableElements.at(-1);
		if (!firstElement || !lastElement) return;

		if (event.shiftKey && document.activeElement === firstElement) {
			event.preventDefault();
			lastElement.focus();
		} else if (!event.shiftKey && document.activeElement === lastElement) {
			event.preventDefault();
			firstElement.focus();
		}
	}

	function showStartSolvingConfirmation() {
		startSolvingDialog.showModal();
	}

	function startSolving() {
		if (puzzlePhase !== 'setup') return;

		resetPuzzleEditHistory();
		for (const cell of gridStateRows.flat()) {
			cell.isClue = cell.fillNumber !== null;
		}
		puzzlePhase = 'solving';
		openInfoSection = 'guide';
		keypadMode = 'Enter digit';
		revealedNumber = null;
		clearHeldModifiers();
		startSolvingDialog.close();
		startSolveTimer();
		completePuzzleIfValid();
		persistCurrentPuzzle();
		void tick().then(() => {
			if (puzzlePhase === 'solving') {
				document.querySelector<HTMLButtonElement>('.number-keypad button')?.focus();
			}
		});
	}

	function showEditPuzzleConfirmation() {
		reopenCompletionAfterEditCancel = false;
		editPuzzleDialog.showModal();
	}

	function showNewPuzzleConfirmation() {
		newPuzzleDialog.showModal();
	}

	function showEditPuzzleFromCompletion() {
		reopenCompletionAfterEditCancel = true;
		restoreCompletionFocusOnClose = false;
		completionDialog.close();
		editPuzzleDialog.showModal();
	}

	function handleEditPuzzleDialogClose() {
		if (reopenCompletionAfterEditCancel && puzzlePhase === 'completed') {
			reopenCompletionAfterEditCancel = false;
			completionDialog.showModal();
			return;
		}

		reopenCompletionAfterEditCancel = false;
	}

	function dismissCompletionOverlay() {
		completionDialog.close();
	}

	function handleCompletionDialogClose() {
		if (!restoreCompletionFocusOnClose) {
			restoreCompletionFocusOnClose = true;
			return;
		}

		const returnFocus = completionReturnFocus;
		void tick().then(() => {
			if (returnFocus?.isConnected) returnFocus.focus();
		});
	}

	function clearSelection() {
		for (const cell of selectedCells) {
			cell.isSelected = false;
		}
		selectedCells = [];
	}

	function returnToSetup() {
		const allCells = gridStateRows.flat();
		for (const cell of allCells) {
			if (!cell.isClue) {
				cell.fillNumber = null;
			}
			cell.manuallyAddedCandidates.fill(false);
			cell.crossedOutCandidates.fill(false);
			cell.boldCandidates.fill(false);
		}
		recalculateCandidates(allCells);
		resetPuzzleEditHistory();
		clearSelection();
		puzzlePhase = 'setup';
		openInfoSection = 'guide';
		showSetupCandidates = false;
		keypadMode = 'Enter digit';
		revealedNumber = null;
		multiSelect = false;
		resetSolveTimer();
		reopenCompletionAfterEditCancel = false;
		completionReturnFocus = null;
		clearHeldModifiers();
		editPuzzleDialog.close();
		persistCurrentPuzzle();
		void tick().then(() => {
			const setupFocusTarget =
				document.querySelector<HTMLButtonElement>('button[aria-label="Start solving"]') ??
				document.querySelector<HTMLButtonElement>('#info-settings-trigger');
			setupFocusTarget?.focus();
		});
	}

	function beginFreshPuzzle() {
		clearSelection();
		resetSolveTimer();
		resetPuzzleEditHistory();
		gridState = initializeGrid();
		puzzlePhase = 'setup';
		displayedPanel = 'Keypad';
		openInfoSection = 'guide';
		showSetupCandidates = false;
		keypadMode = 'Enter digit';
		revealedNumber = null;
		multiSelect = false;
		reopenCompletionAfterEditCancel = false;
		completionReturnFocus = null;
		restoreCompletionFocusOnClose = true;
		clearHeldModifiers();
		clearStoredPuzzle();
		newPuzzleDialog.close();
		void tick().then(() => {
			document.querySelector<HTMLButtonElement>('button[aria-label="Start solving"]')?.focus();
		});
	}

	function clearShareFragment() {
		const url = new URL(window.location.href);
		if (!url.hash) return;

		url.hash = '';
		history.replaceState(history.state, '', `${url.pathname}${url.search}`);
	}

	function focusPuzzleAfterIncomingDialog() {
		void tick().then(() => {
			if (puzzlePhase === 'completed') {
				showRestoredCompletionOverlay();
			} else {
				document.querySelector<HTMLElement>('.sudoku-grid')?.focus();
			}
		});
	}

	function applySharedPuzzle(sharedPuzzle: RestoredPuzzleState) {
		clearSelection();
		resetSolveTimer();
		resetPuzzleEditHistory();
		gridState = sharedPuzzle.gridState;
		puzzlePhase = 'setup';
		displayedPanel = 'Keypad';
		openInfoSection = 'guide';
		showSetupCandidates = false;
		keypadMode = 'Enter digit';
		revealedNumber = null;
		multiSelect = false;
		reopenCompletionAfterEditCancel = false;
		completionReturnFocus = null;
		restoreCompletionFocusOnClose = true;
		clearHeldModifiers();
		clearStoredPuzzle();
		persistCurrentPuzzle();
		pendingSharedPuzzle = null;
		if (replaceSharedPuzzleDialog.open) replaceSharedPuzzleDialog.close();
		clearShareFragment();
		void tick().then(() => {
			document.querySelector<HTMLButtonElement>('button[aria-label="Start solving"]')?.focus();
		});
	}

	function acceptSharedPuzzle() {
		if (pendingSharedPuzzle === null) return;
		applySharedPuzzle(pendingSharedPuzzle);
	}

	function cancelSharedPuzzleReplacement() {
		pendingSharedPuzzle = null;
		replaceSharedPuzzleDialog.close();
		clearShareFragment();
		focusPuzzleAfterIncomingDialog();
	}

	function dismissShareLinkError() {
		shareLinkErrorDialog.close();
		if (shareLinkErrorIsIncoming) {
			clearShareFragment();
			focusPuzzleAfterIncomingDialog();
		}
		shareLinkErrorIsIncoming = false;
	}

	function handleSharedPuzzleOnLoad(shared: SharedPuzzleFragmentResult) {
		if (shared.kind === 'none') return;

		if (shared.kind === 'error') {
			shareLinkErrorTitle = 'Could not open share link';
			shareLinkErrorMessage = shared.error.message;
			shareLinkErrorIsIncoming = true;
			void tick().then(() => shareLinkErrorDialog.showModal());
			return;
		}

		if (!hasMeaningfulPuzzleState()) {
			applySharedPuzzle(shared.puzzle);
			return;
		}

		pendingSharedPuzzle = shared.puzzle;
		void tick().then(() => replaceSharedPuzzleDialog.showModal());
	}

	function showSharePuzzle() {
		const result = createShareUrl(window.location.href, createPuzzleDefinition(gridState));
		if (!result.ok) {
			shareLinkErrorTitle = 'Could not create share link';
			shareLinkErrorMessage = result.error.message;
			shareLinkErrorIsIncoming = false;
			shareLinkErrorDialog.showModal();
			return;
		}

		shareUrl = result.value;
		shareCopyMessage = '';
		sharePuzzleDialog.showModal();
	}

	async function copyShareUrl() {
		try {
			if (!navigator.clipboard) throw new Error('Clipboard API unavailable');
			await navigator.clipboard.writeText(shareUrl);
			shareCopyMessage = 'Share link copied.';
		} catch {
			shareCopyMessage = 'Automatic copying failed. Select and copy the link manually.';
			shareUrlInput.focus();
			shareUrlInput.select();
		}
	}

	function toggleDarkMode() {
		darkMode = !darkMode;
		applyTheme();
		persistTheme();
	}

	function toggleNoteLayout() {
		flippedNotes = !flippedNotes;
		persistUserPreferences();
	}

	function toggleInfoSection(section: InfoSection) {
		openInfoSection = openInfoSection === section ? null : section;
	}

	function toggleReturnToRevealAfterEdits() {
		returnToRevealAfterEdits = !returnToRevealAfterEdits;
		persistUserPreferences();
	}

	function toggleLiveTimerVisibility() {
		showLiveTimer = !showLiveTimer;
		persistUserPreferences();
	}

	let keypadStrings = $derived(
		(flippedNotes ? flippedKeypadInts : keypadInts).map((number) => String(number))
	);
	const panelLabels = ['Keypad', 'Info'];

	function cssPixels(value: string, fallback: number) {
		const parsedValue = Number.parseFloat(value);
		return Number.isFinite(parsedValue) ? parsedValue : fallback;
	}

	function updateResponsiveLayout() {
		if (!appContainer) return;

		const width = appContainer.clientWidth;
		const height = appContainer.clientHeight;
		if (width <= 0 || height <= 0) return;

		const styles = getComputedStyle(appContainer);
		const panelEdgeElement = appContainer.querySelector<HTMLElement>(
			'.sudoku-grid-container .right-parallelogram'
		);
		const buttonEdgeElement = document.querySelector<HTMLElement>('.button-right-parallelogram');
		const panelEdge = panelEdgeElement ? cssPixels(getComputedStyle(panelEdgeElement).width, 8) : 8;
		const buttonEdge = buttonEdgeElement
			? cssPixels(getComputedStyle(buttonEdgeElement).width, 5)
			: 5;
		const faceBorder = cssPixels(styles.getPropertyValue('--panel-face-border-size'), 4);
		const sectionGap = cssPixels(styles.getPropertyValue('--section-gap'), 8);
		const paddingLeft = cssPixels(styles.paddingLeft, 8);
		const paddingRight = cssPixels(styles.paddingRight, 8 + panelEdge);
		const bottomPadding = cssPixels(styles.paddingBottom, 8 + panelEdge);
		const selectorHeight = cssPixels(styles.getPropertyValue('--text-control-height'), 24);

		const contentWidth = width - paddingLeft - paddingRight;
		const sideColumnGap = panelEdge + sectionGap;
		const clampKeySize = (...capacities: number[]) =>
			Math.max(minimumKeySize, Math.min(preferredKeySize, ...capacities));

		const sideWidthWithoutKeys = sideColumnGap + 7 * buttonEdge + 2 * faceBorder;
		const sideHeightWithoutKeys =
			selectorHeight + 14 * buttonEdge + sectionGap + 2 * faceBorder + bottomPadding;
		const sideLayout = {
			gridAt: (size: number) =>
				Math.min(height - bottomPadding, contentWidth - sideWidthWithoutKeys - 3 * size),
			fits: (size: number) => sideHeightWithoutKeys + 6 * size <= height,
			keyCapacityAt: (boardSize: number) =>
				Math.min(
					(contentWidth - boardSize - sideWidthWithoutKeys) / 3,
					(height - sideHeightWithoutKeys) / 6
				)
		};

		const stackedWidthWithoutKeys = 13 * buttonEdge + 2 * faceBorder;
		const stackedHeightWithoutKeys =
			selectorHeight + panelEdge + 2 * sectionGap + 8 * buttonEdge + 2 * faceBorder + bottomPadding;
		const stackedLayout = {
			gridAt: (size: number) =>
				Math.min(contentWidth, height - stackedHeightWithoutKeys - 3 * size),
			fits: (size: number) => stackedWidthWithoutKeys + 6 * size <= contentWidth,
			keyCapacityAt: (boardSize: number) =>
				Math.min(
					(contentWidth - stackedWidthWithoutKeys) / 6,
					(height - boardSize - stackedHeightWithoutKeys) / 3
				)
		};

		if (width >= wideLayoutMinimumWidth) {
			const wideWidthWithoutKeys = 2 * sideColumnGap + 2 * (7 * buttonEdge + 2 * faceBorder);
			const wideGridAt = (size: number) =>
				Math.min(height - bottomPadding, contentWidth - wideWidthWithoutKeys - 6 * size);
			const gridAtMinimumKeys = wideGridAt(minimumKeySize);

			layoutMode = 'wide';
			keySize = clampKeySize(
				(contentWidth - gridAtMinimumKeys - wideWidthWithoutKeys) / 6,
				(height - bottomPadding - (13 * buttonEdge + 2 * faceBorder)) / 6
			);
			gridSize = Math.max(1, Math.floor(wideGridAt(keySize)));
			infoPanelMaxHeight = `${Math.max(1, Math.floor(height - bottomPadding))}px`;
			allowLayoutOverflow = false;
			return;
		}

		const sideCandidate = sideLayout.fits(minimumKeySize)
			? sideLayout.gridAt(minimumKeySize)
			: Number.NEGATIVE_INFINITY;
		const stackedCandidate = stackedLayout.fits(minimumKeySize)
			? stackedLayout.gridAt(minimumKeySize)
			: Number.NEGATIVE_INFINITY;
		const winner =
			sideCandidate >= stackedCandidate
				? { mode: 'side' as const, grid: sideCandidate, layout: sideLayout }
				: { mode: 'stacked' as const, grid: stackedCandidate, layout: stackedLayout };

		if (!Number.isFinite(winner.grid) || winner.grid < minimumUsefulGridSize) {
			layoutMode = 'stacked';
			keySize = minimumKeySize;
			gridSize = Math.max(1, Math.floor(contentWidth));
			infoPanelMaxHeight = 'none';
			allowLayoutOverflow = true;
			return;
		}

		allowLayoutOverflow = false;
		layoutMode = winner.mode;
		keySize = clampKeySize(winner.layout.keyCapacityAt(winner.grid));
		gridSize = Math.max(1, Math.floor(winner.layout.gridAt(keySize)));
		const spaceAbovePanel =
			winner.mode === 'stacked'
				? gridSize + selectorHeight + panelEdge + buttonEdge + 2 * sectionGap
				: selectorHeight + buttonEdge + sectionGap;
		infoPanelMaxHeight = `${Math.max(1, Math.floor(height - bottomPadding - spaceAbovePanel))}px`;
	}

	onMount(() => {
		restoreTheme();
		restoreUserPreferences();
		const sharedPuzzle = decodeSharedPuzzleFragment(window.location.hash);
		restoreCurrentPuzzle(sharedPuzzle.kind === 'none');
		handleSharedPuzzleOnLoad(sharedPuzzle);
		const resizeObserver = new ResizeObserver(updateResponsiveLayout);
		resizeObserver.observe(appContainer);
		document.addEventListener('visibilitychange', handleVisibilityChange);
		window.addEventListener('pagehide', handlePageHide);
		window.addEventListener('pageshow', handlePageShow);
		requestAnimationFrame(updateResponsiveLayout);
		return () => {
			resizeObserver.disconnect();
			document.removeEventListener('visibilitychange', handleVisibilityChange);
			window.removeEventListener('pagehide', handlePageHide);
			window.removeEventListener('pageshow', handlePageShow);
			clearTimerUpdates();
		};
	});
</script>

<svelte:window
	onkeydown={handleModifierKeyDown}
	onkeyup={handleModifierKeyUp}
	onblur={clearHeldModifiers}
/>

<div
	class="app-container layout-{layoutMode}"
	class:allow-layout-overflow={allowLayoutOverflow}
	data-puzzle-phase={puzzlePhase}
	bind:this={appContainer}
	style={layoutStyle}
>
	{#if displayedPanel === 'Info' || layoutMode === 'wide'}
		<div class="left-panel">
			<IsometricBorder color="secondary" fitHeight>
				<div class="info-content bg-background-lightest">
					<h1 class="puzzle-phase text-primary cascadia-code">
						Puzzle {puzzlePhase === 'setup' ? 'setup' : puzzlePhase}
					</h1>
					{#if puzzlePhase !== 'setup' && showLiveTimer}
						<p class="live-timer text-text cascadia-code" role="timer">
							<span>Solve time</span>
							<time>{formattedElapsedTime}</time>
						</p>
					{/if}
					<div class="info-accordion cascadia-code">
						<section class="accordion-item">
							<h2>
								<button
									type="button"
									class="accordion-trigger"
									aria-expanded={openInfoSection === 'guide'}
									aria-controls="info-guide-panel"
									id="info-guide-trigger"
									onclick={() => toggleInfoSection('guide')}
								>
									<span>Using Sudoku Note</span>
									<span class="accordion-indicator" aria-hidden="true">
										{openInfoSection === 'guide' ? '−' : '+'}
									</span>
								</button>
							</h2>
							{#if openInfoSection === 'guide'}
								<div
									class="accordion-panel text-text"
									id="info-guide-panel"
									role="region"
									aria-labelledby="info-guide-trigger"
								>
									{#if puzzlePhase === 'setup'}
										<p>
											Sudoku Note is a workspace for solving a Sudoku you already have, such as one
											from a newspaper, book, or another website.
										</p>
										<p>
											Copy the numbers provided by that puzzle into the matching cells on this grid,
											then press the start solving button. The copied numbers will become fixed
											clues, and the solving tools will become available.
										</p>
									{:else}
										<p>
											The numbers copied during Setup are now fixed clues. Select a cell and use the
											number keypad or candidate tools to work through the puzzle.
										</p>
										<p>
											If a starting clue was copied incorrectly, open Settings and choose Edit
											puzzle. Returning to Setup will discard the current solving progress.
										</p>
									{/if}
								</div>
							{/if}
						</section>

						<section class="accordion-item">
							<h2>
								<button
									type="button"
									class="accordion-trigger"
									aria-expanded={openInfoSection === 'rules'}
									aria-controls="info-rules-panel"
									id="info-rules-trigger"
									onclick={() => toggleInfoSection('rules')}
								>
									<span>Rules</span>
									<span class="accordion-indicator" aria-hidden="true">
										{openInfoSection === 'rules' ? '−' : '+'}
									</span>
								</button>
							</h2>
							{#if openInfoSection === 'rules'}
								<div
									class="accordion-panel text-text"
									id="info-rules-panel"
									role="region"
									aria-labelledby="info-rules-trigger"
								>
									<h3 class="text-primary">Standard Sudoku</h3>
									<p>
										Fill the grid with digits 1–9 so each appears once in every row, column, and 3×3
										box.
									</p>
								</div>
							{/if}
						</section>

						<section class="accordion-item">
							<h2>
								<button
									type="button"
									class="accordion-trigger"
									aria-expanded={openInfoSection === 'controls'}
									aria-controls="info-controls-panel"
									id="info-controls-trigger"
									onclick={() => toggleInfoSection('controls')}
								>
									<span>Controls</span>
									<span class="accordion-indicator" aria-hidden="true">
										{openInfoSection === 'controls' ? '−' : '+'}
									</span>
								</button>
							</h2>
							{#if openInfoSection === 'controls'}
								<div
									class="accordion-panel text-text"
									id="info-controls-panel"
									role="region"
									aria-labelledby="info-controls-trigger"
								>
									<h3 class="text-primary">Keyboard controls</h3>
									<ul class="keyboard-controls">
										<li><kbd>Arrow keys</kbd> move the selection</li>
										<li><kbd>Shift</kbd> + <kbd>Arrow keys</kbd> extend the selection</li>
										{#if puzzlePhase === 'setup'}
											<li><kbd>1–9</kbd> enters or replaces clues</li>
										{:else}
											<li><kbd>1–9</kbd> use the selected keypad tool</li>
											<li><kbd>Space</kbd> cycles through keypad tools</li>
											<li>
												Holding <kbd>Shift</kbd> temporarily switches to Crossout candidate
											</li>
											<li>Holding <kbd>Ctrl</kbd> temporarily switches to Enter digit</li>
										{/if}
										<li>
											<kbd>Backspace</kbd> or <kbd>Delete</kbd> removes entered digits from selected
											cells
										</li>
										<li><kbd>Ctrl/Cmd</kbd> + <kbd>Z</kbd> undoes the last puzzle edit</li>
										<li>
											<kbd>Ctrl/Cmd</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> or <kbd>Ctrl</kbd> +
											<kbd>Y</kbd> redoes it
										</li>
										<li><kbd>Escape</kbd> clears the selection</li>
									</ul>
								</div>
							{/if}
						</section>

						<section class="accordion-item">
							<h2>
								<button
									type="button"
									class="accordion-trigger"
									aria-expanded={openInfoSection === 'settings'}
									aria-controls="info-settings-panel"
									id="info-settings-trigger"
									onclick={() => toggleInfoSection('settings')}
								>
									<span>Settings</span>
									<span class="accordion-indicator" aria-hidden="true">
										{openInfoSection === 'settings' ? '−' : '+'}
									</span>
								</button>
							</h2>
							{#if openInfoSection === 'settings'}
								<div
									class="accordion-panel text-text"
									id="info-settings-panel"
									role="region"
									aria-labelledby="info-settings-trigger"
								>
									<div class="settings-switches">
										<TextSwitch
											label="Dark Mode"
											onchangeHandler={toggleDarkMode}
											binder={darkMode}
										/>
										<TextSwitch
											label="Flipped notes"
											onchangeHandler={toggleNoteLayout}
											binder={flippedNotes}
										/>
										<TextSwitch
											label="Show live timer"
											onchangeHandler={toggleLiveTimerVisibility}
											binder={showLiveTimer}
										/>
										{#if puzzlePhase !== 'setup'}
											<TextSwitch
												label="Return to Reveal after edits"
												onchangeHandler={toggleReturnToRevealAfterEdits}
												binder={returnToRevealAfterEdits}
											/>
											<button
												class="settings-action-button cascadia-code"
												data-preserve-grid-selection
												onclick={showEditPuzzleConfirmation}>Edit puzzle</button
											>
										{/if}
										<button
											class="settings-action-button cascadia-code"
											data-preserve-grid-selection
											onclick={showSharePuzzle}>Share puzzle</button
										>
										<button
											class="settings-action-button cascadia-code"
											data-preserve-grid-selection
											onclick={showNewPuzzleConfirmation}>New puzzle</button
										>
									</div>
								</div>
							{/if}
						</section>
					</div>
				</div>
			</IsometricBorder>
		</div>
	{/if}

	<div class="sudoku-grid-container">
		<IsometricBorder color="primary">
			<SudokuGrid
				bind:gridState
				bind:gridStateRows
				bind:selectedCells
				bind:lastSelected
				{flippedNotes}
				{multiSelect}
				{puzzlePhase}
				showCandidates={puzzlePhase !== 'setup' || showSetupCandidates}
				revealedNumber={activeKeypadMode === 'Reveal all candidates' ? revealedNumber : null}
				{clearCells}
				handleNumberInput={handleKeyboardNumber}
			/>
		</IsometricBorder>
	</div>

	{#if displayedPanel === 'Keypad' || layoutMode === 'wide'}
		<div class="right-panel">
			<IsometricBorder color="accent" fitContent>
				<div class="keypad-content bg-background-lightest">
					<!-- <h1 class="text-primary cascadia-code">Keypad</h1> -->
					<div class="keypad">
						<div class="number-keypad">
							{#each keypadStrings as num (num)}
								<KeypadButton
									label={num}
									color="primary"
									onchangeHandler={(event) =>
										handleKeypadNumber(Number(num), event.detail === 0 ? 'keyboard' : 'pointer')}
								/>
							{/each}
						</div>
						<div class="tool-keypad">
							{#if puzzlePhase === 'setup'}
								<KeypadButton
									label="Erase clue"
									color="secondary"
									onchangeHandler={() => clearCells(selectedCells)}
								>
									<Delete />
								</KeypadButton>
								<KeypadButton
									label="Start solving"
									color="text"
									onchangeHandler={showStartSolvingConfirmation}
								>
									<Play />
								</KeypadButton>
								<KeypadButton
									label="Show candidates"
									color="accent"
									checkbox
									bind:checked={showSetupCandidates}
								>
									<Spotlight />
								</KeypadButton>
							{:else}
								<KeypadButton
									label="Delete digit"
									color="secondary"
									onchangeHandler={() => clearCells(selectedCells)}
								>
									<Delete />
								</KeypadButton>
								<KeypadButton
									label="Enter digit"
									color="text"
									toggle
									bind:binder={keypadMode}
									activeBinder={activeKeypadMode}
								>
									<SquareArrowRight />
								</KeypadButton>
								<KeypadButton
									label="Reveal all candidates"
									color="accent"
									toggle
									bind:binder={keypadMode}
									activeBinder={activeKeypadMode}
								>
									<Spotlight />
								</KeypadButton>
								<KeypadButton
									label="Crossout candidate"
									color="secondary"
									toggle
									bind:binder={keypadMode}
									activeBinder={activeKeypadMode}
								>
									<PencilOff />
								</KeypadButton>
								<KeypadButton
									label="Add candidate"
									color="text"
									toggle
									bind:binder={keypadMode}
									activeBinder={activeKeypadMode}
								>
									<Pencil />
								</KeypadButton>
								<KeypadButton
									label="Bold candidate"
									color="accent"
									toggle
									bind:binder={keypadMode}
									activeBinder={activeKeypadMode}
								>
									<Highlighter />
								</KeypadButton>
							{/if}
						</div>
						<div class="secondary-keypad">
							<KeypadButton
								label="Undo"
								color="secondary"
								disabled={!canUndo}
								onchangeHandler={undoPuzzleEdit}
							>
								<Undo />
							</KeypadButton>
							<KeypadButton
								label="Redo"
								color="text"
								disabled={!canRedo}
								onchangeHandler={redoPuzzleEdit}
							>
								<Redo />
							</KeypadButton>
							<KeypadButton label="Multi-select" color="accent" checkbox bind:checked={multiSelect}>
								<Grid2x2Plus />
							</KeypadButton>
						</div>
					</div>
				</div>
			</IsometricBorder>
		</div>
	{/if}

	<div class="layout-button-container">
		<RadioButtons labels={panelLabels} bind:binder={displayedPanel} />
	</div>
</div>

<dialog
	class="confirmation-dialog"
	bind:this={startSolvingDialog}
	data-preserve-grid-selection
	aria-labelledby="start-solving-title"
	onkeydown={containDialogFocus}
>
	<form method="dialog">
		<h2 id="start-solving-title">Start solving?</h2>
		<p>The current digits will become fixed clues and the solve timer will begin.</p>
		<div class="dialog-actions">
			<button>Cancel</button>
			<button type="button" onclick={startSolving}>Start solving</button>
		</div>
	</form>
</dialog>

<dialog
	class="confirmation-dialog"
	bind:this={newPuzzleDialog}
	data-preserve-grid-selection
	aria-labelledby="new-puzzle-title"
	onkeydown={containDialogFocus}
>
	<form method="dialog">
		<h2 id="new-puzzle-title">Start a new puzzle?</h2>
		<p>This will clear the current puzzle and solving progress from this browser.</p>
		<div class="dialog-actions">
			<button>Cancel</button>
			<button type="button" onclick={beginFreshPuzzle}>New puzzle</button>
		</div>
	</form>
</dialog>

<dialog
	class="confirmation-dialog"
	bind:this={editPuzzleDialog}
	data-preserve-grid-selection
	aria-labelledby="edit-puzzle-title"
	onclose={handleEditPuzzleDialogClose}
	onkeydown={containDialogFocus}
>
	<form method="dialog">
		<h2 id="edit-puzzle-title">Return to Setup?</h2>
		<p>Your solving progress and current time will be cleared.</p>
		<div class="dialog-actions">
			<button>Cancel</button>
			<button type="button" onclick={returnToSetup}>Return to Setup</button>
		</div>
	</form>
</dialog>

<dialog
	class="confirmation-dialog share-dialog"
	bind:this={sharePuzzleDialog}
	data-preserve-grid-selection
	aria-labelledby="share-puzzle-title"
	onkeydown={containDialogFocus}
>
	<h2 id="share-puzzle-title">Share puzzle</h2>
	<p>
		This link contains the fixed clues only, without solving progress, notes, time, or settings.
	</p>
	<label class="share-url-label" for="share-url">Share URL</label>
	<input
		class="share-url-input"
		id="share-url"
		bind:this={shareUrlInput}
		value={shareUrl}
		readonly
		onfocus={(event) => event.currentTarget.select()}
	/>
	<p class="share-status" role="status" aria-live="polite">{shareCopyMessage}</p>
	<div class="dialog-actions">
		<button type="button" onclick={() => sharePuzzleDialog.close()}>Close</button>
		<button type="button" onclick={copyShareUrl}>Copy link</button>
	</div>
</dialog>

<dialog
	class="confirmation-dialog"
	bind:this={replaceSharedPuzzleDialog}
	data-preserve-grid-selection
	aria-labelledby="replace-shared-puzzle-title"
	oncancel={(event) => {
		event.preventDefault();
		cancelSharedPuzzleReplacement();
	}}
	onkeydown={containDialogFocus}
>
	<h2 id="replace-shared-puzzle-title">Open shared puzzle?</h2>
	<p>This will replace your current puzzle and discard its solving progress in this browser.</p>
	<div class="dialog-actions">
		<button type="button" onclick={cancelSharedPuzzleReplacement}>Cancel</button>
		<button type="button" onclick={acceptSharedPuzzle}>Open shared puzzle</button>
	</div>
</dialog>

<dialog
	class="confirmation-dialog"
	bind:this={shareLinkErrorDialog}
	data-preserve-grid-selection
	aria-labelledby="share-link-error-title"
	oncancel={(event) => {
		event.preventDefault();
		dismissShareLinkError();
	}}
	onkeydown={containDialogFocus}
>
	<h2 id="share-link-error-title">{shareLinkErrorTitle}</h2>
	<p>{shareLinkErrorMessage}</p>
	<div class="dialog-actions">
		<button type="button" onclick={dismissShareLinkError}>OK</button>
	</div>
</dialog>

<dialog
	class="confirmation-dialog completion-dialog"
	bind:this={completionDialog}
	data-preserve-grid-selection
	aria-labelledby="completion-title"
	aria-describedby="completion-message"
	onclose={handleCompletionDialogClose}
	onkeydown={containDialogFocus}
>
	<h2 id="completion-title">Congratulations!</h2>
	<p id="completion-message">
		You completed the puzzle in <strong><time>{formattedElapsedTime}</time></strong>.
	</p>
	<div class="dialog-actions">
		<button type="button" onclick={dismissCompletionOverlay}>View puzzle</button>
		<button type="button" onclick={showEditPuzzleFromCompletion}>Edit puzzle</button>
	</div>
</dialog>

<style lang="scss">
	.app-container {
		--page-gap: 0.5rem;
		--section-gap: 8px;
		--keypad-gap: calc(var(--button-border-width) * 2);
		--keypad-padding: var(--button-border-width);
		--panel-face-border-size: 4px;

		display: grid;
		flex: 1 1 0;
		width: 100%;
		min-height: 0;
		min-width: 0;
		padding: 0 calc(var(--page-gap) + var(--panel-border-width))
			calc(var(--page-gap) + var(--panel-border-width)) var(--page-gap);
		overflow: hidden;
	}

	.sudoku-grid-container {
		grid-area: sudoku;
		aspect-ratio: 1;
		height: var(--grid-size);
		width: var(--grid-size);
	}

	.left-panel,
	.right-panel {
		grid-area: panel;
		min-width: 0;
		min-height: 0;
		align-self: start;
		justify-self: start;
	}

	.left-panel {
		width: 100%;
	}

	.right-panel {
		--size-font: 4rem;
	}

	.info-content {
		max-height: var(--info-panel-max-height);
		border: var(--panel-face-border-size) solid var(--color-secondary-light);
		padding: var(--keypad-padding);
		padding-bottom: calc(var(--keypad-padding) + var(--button-border-width));
		overflow-y: auto;
		overscroll-behavior: contain;
	}

	.puzzle-phase {
		margin-bottom: 1rem;
		text-transform: capitalize;
	}

	.live-timer {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		margin: -0.5rem 0 1rem;
		font-variant-numeric: tabular-nums;
	}

	.info-accordion {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.accordion-item h2 {
		margin: 0;
	}

	.accordion-trigger {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		min-height: var(--text-control-height);
		padding: 0.5rem 0.75rem;
		border: 2px solid var(--color-secondary);
		color: var(--color-text);
		background: var(--color-background-lightest);
		font: inherit;
		font-weight: 700;
		text-align: left;
		cursor: pointer;
	}

	.accordion-trigger:hover,
	.accordion-trigger:focus-visible,
	.accordion-trigger[aria-expanded='true'] {
		color: var(--color-background-lightest);
		background: var(--color-secondary);
	}

	.accordion-indicator {
		font-size: 1.25em;
		line-height: 1;
	}

	.accordion-panel {
		padding: 0.75rem;
		border: 2px solid var(--color-secondary-light);
		border-top: 0;
	}

	.accordion-panel h3 {
		margin-bottom: 0.5rem;
	}

	.accordion-panel p + p {
		margin-top: 0.75rem;
	}

	.settings-switches {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 1rem;
		margin-top: 1rem;
	}

	.accordion-panel .settings-switches {
		margin-top: 0;
	}

	.settings-action-button {
		min-height: var(--text-control-height);
		padding: 0.35rem 0.75rem;
		border: 2px solid var(--color-secondary);
		color: var(--color-secondary);
		background: var(--color-background-lightest);
		cursor: pointer;
	}

	.settings-action-button:hover,
	.settings-action-button:focus-visible {
		color: var(--color-background-lightest);
		background: var(--color-secondary);
	}

	.keypad-content {
		border: var(--panel-face-border-size) solid var(--color-accent-light);
		// Button faces define the grid size, while their isometric edges overflow it.
		// Add that edge depth so the visible right/bottom whitespace matches the left.
		padding: var(--keypad-padding);
		padding-right: calc(var(--keypad-padding) + var(--button-border-width));
		padding-bottom: calc(var(--keypad-padding) + var(--button-border-width));
	}

	.left-panel h1 {
		margin-bottom: 1rem;
	}

	.keyboard-controls {
		padding-left: 1.5rem;
	}

	.keyboard-controls li + li {
		margin-top: 0.5rem;
	}

	.keyboard-controls kbd {
		font: inherit;
		color: var(--color-primary);
	}

	.keypad {
		display: grid;
		grid-template-columns: repeat(3, var(--key-size, max-content));
		gap: var(--keypad-gap);
	}

	.number-keypad,
	.tool-keypad,
	.secondary-keypad {
		display: contents;
	}

	.layout-button-container {
		display: flex;
		grid-area: button;
		align-self: start;
		justify-content: flex-start;
		gap: var(--keypad-gap);
	}

	.layout-side {
		grid-template-columns: var(--grid-size) max-content minmax(0, 1fr);
		grid-template-rows: auto minmax(0, 1fr);
		grid-template-areas:
			'sudoku button .'
			'sudoku panel .';
		column-gap: calc(var(--panel-border-width) + var(--section-gap));
	}

	.layout-side .layout-button-container {
		margin-bottom: calc(var(--button-border-width) + var(--section-gap));
	}

	.layout-wide .right-panel,
	.layout-side .right-panel,
	.layout-stacked .right-panel {
		--size-font: calc(var(--key-size) - 1vmin);
	}

	.layout-stacked {
		grid-template-columns: var(--grid-size) minmax(0, 1fr);
		grid-template-rows: var(--grid-size) auto minmax(0, 1fr);
		align-content: start;
		grid-template-areas:
			'sudoku .'
			'button .'
			'panel .';
	}

	.layout-stacked .layout-button-container {
		margin-top: calc(var(--panel-border-width) + var(--section-gap));
		margin-bottom: calc(var(--button-border-width) + var(--section-gap));
	}

	.layout-stacked .left-panel {
		width: var(--grid-size);
	}

	.layout-stacked .keypad {
		grid-template-columns: max-content max-content var(--key-size);
	}

	.layout-stacked .number-keypad {
		display: grid;
		grid-template-columns: repeat(3, var(--key-size));
		gap: var(--keypad-gap);
	}

	.layout-stacked .tool-keypad {
		display: grid;
		grid-template-rows: repeat(3, var(--key-size));
		grid-auto-flow: column;
		gap: var(--keypad-gap);
	}

	.layout-stacked .secondary-keypad {
		display: grid;
		grid-template-rows: repeat(3, var(--key-size));
		gap: var(--keypad-gap);
	}

	.layout-wide {
		grid-template-columns:
			minmax(0, 1fr) var(--grid-size)
			minmax(0, 1fr);
		grid-template-rows: minmax(0, 1fr);
		grid-template-areas: 'info sudoku keypad';
		column-gap: calc(var(--panel-border-width) + var(--section-gap));
	}

	.layout-wide .left-panel {
		grid-area: info;
	}

	.layout-wide .right-panel {
		grid-area: keypad;
	}

	.layout-wide .layout-button-container {
		display: none;
	}

	.allow-layout-overflow {
		overflow-y: auto;
		grid-template-rows: var(--grid-size) auto auto;
	}

	.confirmation-dialog {
		max-width: min(28rem, calc(100vw - 2rem));
		margin: auto;
		padding: 1.25rem;
		border: 4px solid var(--color-primary);
		color: var(--color-text);
		background: var(--color-background-lightest);
		font-family: 'Cascadia Code', sans-serif;
	}

	.confirmation-dialog::backdrop {
		background: rgb(0 0 0 / 55%);
	}

	.confirmation-dialog p {
		margin-top: 0.75rem;
	}

	.share-url-label {
		display: block;
		margin-top: 1rem;
		font-weight: 700;
	}

	.share-url-input {
		width: 100%;
		min-height: 2.75rem;
		margin-top: 0.35rem;
		padding: 0.5rem;
		border: 2px solid var(--color-primary);
		color: var(--color-text);
		background: var(--color-background-lightest);
		font: inherit;
	}

	.share-status {
		min-height: 1.5em;
	}

	.dialog-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		margin-top: 1.25rem;
	}

	.dialog-actions button {
		min-height: 2.75rem;
		padding: 0.5rem 0.75rem;
		border: 2px solid var(--color-primary);
		color: var(--color-text);
		background: var(--color-background-lightest);
		font: inherit;
		cursor: pointer;
	}

	.dialog-actions button:last-child {
		color: var(--color-background-lightest);
		background: var(--color-primary);
	}
</style>
