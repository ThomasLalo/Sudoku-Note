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
	import Spotlight from '@lucide/svelte/icons/spotlight';
	import SquareArrowRight from '@lucide/svelte/icons/square-arrow-right';
	import { MediaQuery } from 'svelte/reactivity';
	import type { Cell } from './gridUtils';
	import { initializeGrid, getAdjacentCell } from './gridUtils';
	const keypadInts = [7, 8, 9, 4, 5, 6, 1, 2, 3];
	const flippedKeypadInts = [1, 2, 3, 4, 5, 6, 7, 8, 9];
	const smallerThanDesktop = new MediaQuery('max-width: 1615px');
	type KeypadMode =
		| 'Enter digit'
		| 'Reveal all candidates'
		| 'Crossout candidate'
		| 'Add candidate'
		| 'Bold candidate';
	const keypadModes: KeypadMode[] = [
		'Enter digit',
		'Reveal all candidates',
		'Crossout candidate',
		'Add candidate',
		'Bold candidate'
	];

	let displayedPanel = $state('Keypad');
	let keypadMode: KeypadMode = $state('Enter digit');
	let shiftHeld = $state(false);
	let controlHeld = $state(false);
	let activeKeypadMode = $derived.by<KeypadMode>(() => {
		if (controlHeld) return 'Enter digit';
		if (shiftHeld) return 'Crossout candidate';
		return keypadMode;
	});
	let revealedNumber: number | null = $state(null);
	let flippedNotes = $state(false);
	let gridState: Cell[][] = $state(initializeGrid());
	let selectedCells: Cell[] = $state([]);
	let lastSelected: Cell = $derived(gridState[0][0]);
	let gridStateRows: Cell[][] = $derived(reorganizeGrid(gridState)); // 0 based
	let gridStateCols: Cell[][] = $derived(
		gridStateRows[0].map((_, colIndex) => gridStateRows.map((row) => row[colIndex]))
	);

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

	function fillCell(targetCell: Cell, fillValue: number) {
		targetCell.fillNumber = fillValue;
		const seenCells = getSeenCells(targetCell);
		for (const cell of seenCells!) {
			// cells will always exist and see each other
			cell.candidates[keypadInts.indexOf(fillValue)] = false;
		}
	}

	function recalculateCandidates(cells: Iterable<Cell>) {
		for (const cell of cells) {
			const seenCells = getSeenCells(cell);
			cell.candidates = keypadInts.map((candidate) =>
				seenCells.every((seenCell) => seenCell.fillNumber !== candidate)
			);
		}
	}

	function clearCells(targetCells: Cell[]) {
		const affectedCells = new Set(targetCells.flatMap((cell) => getSeenCells(cell)));
		for (const cell of targetCells) {
			cell.fillNumber = null;
		}
		recalculateCandidates(affectedCells);
	}

	function handleKeypadNumber(fillValue: number) {
		if (activeKeypadMode === 'Enter digit') {
			for (const cell of selectedCells) {
				fillCell(cell, fillValue);
			}
		} else if (activeKeypadMode === 'Crossout candidate') {
			const candidateIndex = keypadInts.indexOf(fillValue);
			for (const cell of selectedCells) {
				cell.crossedOutCandidates[candidateIndex] = true;
			}
		} else if (activeKeypadMode === 'Bold candidate') {
			const candidateIndex = keypadInts.indexOf(fillValue);
			for (const cell of selectedCells) {
				cell.boldCandidates[candidateIndex] = true;
			}
		} else if (activeKeypadMode === 'Add candidate') {
			const candidateIndex = keypadInts.indexOf(fillValue);
			for (const cell of selectedCells) {
				if (cell.fillNumber !== null) continue;

				cell.crossedOutCandidates[candidateIndex] = false;
				cell.boldCandidates[candidateIndex] = false;
				if (!cell.candidates[candidateIndex]) {
					cell.manuallyAddedCandidates[candidateIndex] = true;
				}
			}
		} else if (activeKeypadMode === 'Reveal all candidates') {
			revealedNumber = fillValue;
		}
	}

	function handleModifierKeyDown(event: KeyboardEvent) {
		if (event.code === 'Space') {
			event.preventDefault();
			if (!event.repeat) {
				const nextModeIndex = (keypadModes.indexOf(keypadMode) + 1) % keypadModes.length;
				keypadMode = keypadModes[nextModeIndex];
			}
		}
		if (event.key === 'Shift') shiftHeld = true;
		if (event.key === 'Control') controlHeld = true;
	}

	function handleModifierKeyUp(event: KeyboardEvent) {
		if (event.key === 'Shift') shiftHeld = false;
		if (event.key === 'Control') controlHeld = false;
	}

	function clearHeldModifiers() {
		shiftHeld = false;
		controlHeld = false;
	}

	function toggleNoteLayout() {
		flippedNotes = !flippedNotes;
	}

	let keypadStrings = $derived(
		(flippedNotes ? flippedKeypadInts : keypadInts).map((number) => String(number))
	);
	const panelLabels = ['Keypad', 'Info'];
</script>

<svelte:window
	onkeydown={handleModifierKeyDown}
	onkeyup={handleModifierKeyUp}
	onblur={clearHeldModifiers}
/>

<div class="app-container">
	{#if displayedPanel === 'Info' || !smallerThanDesktop.current}
		<div class="left-panel">
			<IsometricBorder color="secondary" fitHeight>
				<div class="info-content bg-background-lightest">
					<h1 class="text-primary cascadia-code">Lorem ipsum</h1>
					<p class="text-text cascadia-code">
						dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore
						et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco
						laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit
						in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat
						cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum
					</p>
					<div class="note-layout-switch">
						<TextSwitch
							label="Flipped notes"
							onchangeHandler={toggleNoteLayout}
							binder={flippedNotes}
						/>
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
				revealedNumber={activeKeypadMode === 'Reveal all candidates' ? revealedNumber : null}
				{clearCells}
				handleNumberInput={handleKeypadNumber}
			/>
		</IsometricBorder>
	</div>

	{#if displayedPanel === 'Keypad' || !smallerThanDesktop.current}
		<div class="right-panel">
			<IsometricBorder color="accent" fitContent>
				<div class="keypad-content bg-background-lightest">
					<h1 class="text-primary cascadia-code">Keypad</h1>
					<div class="keypad">
						{#each keypadStrings as num (num)}
							<KeypadButton
								label={num}
								color="primary"
								onchangeHandler={() => handleKeypadNumber(Number(num))}
							/>
						{/each}
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
					</div>
				</div>
			</IsometricBorder>
		</div>
	{/if}

	<div class="layout-button-container">
		<RadioButtons labels={panelLabels} bind:binder={displayedPanel} />
	</div>
</div>

<style lang="scss">
	.app-container {
		--horizontal-margin: 1vmin;

		display: grid;
		grid-template-areas: 'info sudoku keypad';
		grid-template-columns: 1fr auto 1fr;
	}

	.left-panel {
		margin-right: calc(var(--horizontal-margin) + var(--panel-border-width));
		margin-left: var(--horizontal-margin);
		margin-bottom: var(--panel-border-width);

		grid-area: info;
	}

	.sudoku-grid-container {
		aspect-ratio: 1;
		height: 81vh;
		width: 81vh;
		// The isometric edge occupies the panel-width portion of this margin.
		// Keep one horizontal margin visible after it, matching the info-panel side.
		margin-right: calc(var(--horizontal-margin) + var(--panel-border-width));
		margin-left: var(--horizontal-margin);

		grid-area: sudoku;
	}

	.right-panel {
		margin-right: calc(var(--horizontal-margin) + var(--panel-border-width));
		margin-left: var(--horizontal-margin);
		margin-bottom: var(--panel-border-width);
		align-self: start;
		justify-self: start;

		grid-area: keypad;
	}

	.info-content,
	.keypad-content {
		--panel-face-border-size: 5px;

		height: 100%;
		padding: 0.5vw;
	}

	.info-content {
		border: var(--panel-face-border-size) solid var(--color-secondary-light);
	}

	.note-layout-switch {
		margin-top: 1rem;
	}

	.keypad-content {
		border: var(--panel-face-border-size) solid var(--color-accent-light);
		// Button faces define the grid size, while their isometric edges overflow it.
		// Add that edge depth so the visible right/bottom whitespace matches the left.
		padding-right: calc(0.5vw + var(--button-border-width));
		padding-bottom: calc(0.5vw + var(--button-border-width));
	}

	.left-panel h1,
	.right-panel h1 {
		margin-bottom: 1rem;
	}

	.keypad {
		display: grid;
		grid-template-columns: repeat(3, max-content);
		gap: 1rem;
	}
	.layout-button-container {
		display: none;
		grid-area: button;
	}

	@media (min-width: 1616px) {
		// desktop
		.app-container {
			flex: 1 1 0;
			min-height: 0;
		}

		.sudoku-grid-container {
			// Leave room for the isometric edge so the complete grid fits in the viewport.
			height: calc(100% - var(--panel-border-width));
			width: auto;
		}
	}

	@media (max-width: 1615px) {
		//tablet landscape
		.app-container {
			grid-template-columns: auto 1fr;
			grid-template-rows: auto 1fr;
			grid-template-areas:
				'sudoku button button'
				'sudoku keypad info';
		}
		.layout-button-container {
			display: flex;
			margin-bottom: calc(var(--horizontal-margin) * 2);
			margin-left: var(--horizontal-margin);
			gap: 2vmin;
		}
	}

	@media (max-width: 1080px) {
		.sudoku-grid-container {
			height: 72vh;
			width: 72vh;
		}
	}

	@media (max-width: 1000px) {
		.sudoku-grid-container {
			height: 63vh;
			width: 63vh;
		}
	}

	@media (max-width: 1000px) and (max-height: 859px) {
		.sudoku-grid-container {
			font-size: 0.7rem;
		}
	}

	@media (max-width: 900px) {
		.app-container {
			grid-template-rows: auto auto 1fr;
			grid-template-areas:
				'sudoku'
				'button'
				'keypad'
				'info';
		}

		.sudoku-grid-container {
			height: 54vh;
			width: 54vh;
			font-size: 0.7rem;
		}
		.layout-button-container {
			margin-top: 1rem;
		}
	}

	@media (max-width: 540px) {
		.app-container {
			grid-template-rows: auto auto 1fr;
			grid-template-areas:
				'sudoku'
				'button'
				'keypad'
				'info';
		}

		.sudoku-grid-container {
			height: 95vw;
			width: 95vw;
			font-size: 0.7rem;
		}
		.layout-button-container {
			margin-top: 1rem;
		}
	}
	@media (max-width: 400px) and (max-height: 700px) {
		.sudoku-grid-container {
			font-size: 0.5rem;
		}
	}
	@media (max-width: 450px), (max-height: 680px) {
		.info-content,
		.keypad-content {
			--panel-face-border-size: 0.2rem;
		}
	}
	@media (max-height: 390px) {
		.app-container {
			grid-template-columns: auto 1fr;
			grid-template-rows: auto 1fr;
			grid-template-areas:
				'sudoku button button'
				'sudoku keypad info';
		}

		.sudoku-grid-container {
			height: 95vh;
			width: 95vh;
			font-size: 0.5rem;
		}
		.layout-button-container {
			margin-top: 1rem;
		}
	}
</style>
