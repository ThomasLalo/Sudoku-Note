<script lang="ts">
	import type { Cell } from './gridUtils';
	import { getAdjacentCell } from './gridUtils';
	const keypadInts = [7, 8, 9, 4, 5, 6, 1, 2, 3];
	const flippedInts = [1, 2, 3, 4, 5, 6, 7, 8, 9];
	const innerGridLines = [1, 2, 3, 4, 5, 6, 7, 8];
	const cellSpan = `${100 / 9}%`;

	let {
		gridState = $bindable(),
		gridStateRows = $bindable(),
		selectedCells = $bindable(),
		lastSelected = $bindable(),
		flippedNotes,
		multiSelect,
		puzzlePhase,
		showCandidates,
		revealedNumber,
		handleNumberInput,
		clearCells
	}: {
		gridState: Cell[][];
		gridStateRows: Cell[][];
		selectedCells: Cell[];
		lastSelected: Cell;
		flippedNotes: boolean;
		multiSelect: boolean;
		puzzlePhase: 'setup' | 'solving' | 'completed';
		showCandidates: boolean;
		revealedNumber: number | null;
		handleNumberInput: (value: number) => void;
		clearCells: (targetCells: Cell[]) => void;
	} = $props();

	let candidateInts = $derived(flippedNotes ? flippedInts : keypadInts);

	let conflictingCells = $derived.by(() => {
		const conflicts = new Set<Cell>();
		const columns = gridStateRows[0].map((_, colIndex) =>
			gridStateRows.map((row) => row[colIndex])
		);
		const groups = [...gridStateRows, ...columns, ...gridState];

		for (const group of groups) {
			const cellsByValue = new Map<number, Cell[]>();
			for (const cell of group) {
				if (cell.fillNumber === null) continue;
				const matchingCells = cellsByValue.get(cell.fillNumber) ?? [];
				matchingCells.push(cell);
				cellsByValue.set(cell.fillNumber, matchingCells);
			}

			for (const matchingCells of cellsByValue.values()) {
				if (matchingCells.length > 1) {
					matchingCells.forEach((cell) => conflicts.add(cell));
				}
			}
		}

		for (const cell of gridStateRows.flat()) {
			for (const [candidateIndex, manuallyAdded] of cell.manuallyAddedCandidates.entries()) {
				if (!manuallyAdded || cell.candidates[candidateIndex]) continue;
				const candidate = keypadInts[candidateIndex];
				const seenCells = new Set([
					...gridState[cell.boxNumber - 1],
					...gridStateRows[cell.rowNumber0based],
					...columns[cell.colNumber0based]
				]);
				for (const seenCell of seenCells) {
					if (seenCell.fillNumber === candidate) conflicts.add(seenCell);
				}
			}
		}

		return conflicts;
	});

	let dragAdding = false;
	let dragRemoving = false;
	let activePointerId: number | null = null;
	let lastPointerPosition: { x: number; y: number } | null = null;
	let lastGestureCell: Cell | null = null;
	let hoveredCell: Cell | null = $state(null);

	const isCellSelected = (row: number, col: number) =>
		gridStateRows[row]?.[col]?.isSelected ?? false;

	const hasRevealedCandidate = (cell: Cell) => {
		if (revealedNumber === null || cell.fillNumber !== null) return false;

		const candidateIndex = keypadInts.indexOf(revealedNumber);
		const candidateVisible =
			cell.candidates[candidateIndex] || cell.manuallyAddedCandidates[candidateIndex];
		const candidateInvalid =
			cell.manuallyAddedCandidates[candidateIndex] && !cell.candidates[candidateIndex];

		return candidateVisible && !candidateInvalid && !cell.crossedOutCandidates[candidateIndex];
	};

	const gridPercent = (gridLine: number) => `${(gridLine / 9) * 100}%`;

	function clearSelection() {
		for (let cellObj of selectedCells) {
			cellObj.isSelected = false;
		}
		selectedCells = [];
	}

	function addToSelection(box: number, cell: number) {
		const cellObj = gridState[box][cell];
		if (cellObj.isSelected) return;

		cellObj.isSelected = true;
		selectedCells.push(cellObj);
		lastSelected = cellObj;
	}

	function removeFromSelection(box: number, cell: number) {
		const cellObj = gridState[box][cell];
		if (!cellObj.isSelected) return;

		cellObj.isSelected = false;
		selectedCells = selectedCells.filter((value) => value !== cellObj);
	}

	function handlePointerDown(event: PointerEvent, boxNumber: number, cellNumber: number) {
		if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;

		activePointerId = event.pointerId;
		lastPointerPosition = { x: event.clientX, y: event.clientY };
		const cellObj = gridState[boxNumber][cellNumber];
		if (!event.shiftKey && !multiSelect) {
			clearSelection();
		}
		if (cellObj.isSelected) {
			dragRemoving = true;
			removeFromSelection(boxNumber, cellNumber);
		} else {
			dragAdding = true;
			addToSelection(boxNumber, cellNumber);
		}
		lastGestureCell = cellObj;

		try {
			gridElement?.setPointerCapture(event.pointerId);
		} catch {
			// Synthetic pointer events and interrupted gestures may not be capturable.
		}
	}

	function getCellAtPoint(x: number, y: number) {
		const element = document.elementFromPoint(x, y);
		const cellElement = element?.closest<HTMLElement>('.sudoku-cell');
		if (!cellElement || !gridElement?.contains(cellElement)) return null;

		const boxIndex = Number(cellElement.dataset.boxIndex);
		const cellIndex = Number(cellElement.dataset.cellIndex);
		return gridState[boxIndex]?.[cellIndex] ?? null;
	}

	function applyDragToCell(cell: Cell | null) {
		if (!cell || cell === lastGestureCell) return;

		if (dragAdding) {
			addToSelection(cell.boxNumber - 1, cell.positionInBox - 1);
		} else if (dragRemoving) {
			removeFromSelection(cell.boxNumber - 1, cell.positionInBox - 1);
		}
		lastGestureCell = cell;
	}

	function handlePointerMove(event: PointerEvent) {
		const currentCell = getCellAtPoint(event.clientX, event.clientY);
		if (event.pointerType === 'mouse') hoveredCell = currentCell;
		if (event.pointerId !== activePointerId || !lastPointerPosition) return;

		const gridRect = gridElement?.getBoundingClientRect();
		const sampleSpacing = gridRect
			? Math.max(1, Math.min(gridRect.width, gridRect.height) / 18)
			: 1;
		const xDistance = event.clientX - lastPointerPosition.x;
		const yDistance = event.clientY - lastPointerPosition.y;
		const steps = Math.max(1, Math.ceil(Math.hypot(xDistance, yDistance) / sampleSpacing));

		for (let step = 1; step <= steps; step += 1) {
			const progress = step / steps;
			applyDragToCell(
				getCellAtPoint(
					lastPointerPosition.x + xDistance * progress,
					lastPointerPosition.y + yDistance * progress
				)
			);
		}
		lastPointerPosition = { x: event.clientX, y: event.clientY };
	}

	function finishPointerGesture(event: PointerEvent) {
		if (event.pointerId !== activePointerId) return;

		dragAdding = false;
		dragRemoving = false;
		activePointerId = null;
		lastPointerPosition = null;
		lastGestureCell = null;
		if (event.pointerType !== 'mouse') hoveredCell = null;

		if (gridElement?.hasPointerCapture(event.pointerId)) {
			gridElement.releasePointerCapture(event.pointerId);
		}
	}

	let gridElement: HTMLDivElement | undefined; // grid element might be undefined when the page first loads. see the bind:this on sudoku-grid in the html
	function handleGlobalPointerDown(event: PointerEvent) {
		const target = event.target;
		if (target instanceof Node && gridElement?.contains(target)) {
			return;
		}
		if (target instanceof Element && target.closest('[data-preserve-grid-selection]')) {
			return;
		}
		clearSelection();
	}

	function handleGlobalKeyDown(event: KeyboardEvent) {
		if (document.querySelector('dialog[open]')) return;

		if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
			event.preventDefault();

			if (selectedCells.length !== 0) {
				// ! is not .at() syntax. it is a non-null assertion, I'm telling typescript this cell will always exist. it will because of the if block
				const [newBox, newCellPos] = getAdjacentCell(selectedCells.at(-1)!, event.key);

				if (!event.shiftKey) {
					//only select multiple cells if shift is held down
					clearSelection();
				}
				// selectCell(newBox,newCellPos);
				addToSelection(newBox, newCellPos);
			} else {
				// if nothing is selected then select the cell last previously selected
				// selectCell(lastSelected.boxNumber -1,lastSelected.positionInBox -1);
				addToSelection(lastSelected.boxNumber - 1, lastSelected.positionInBox - 1);
			}
		}

		const numberKeyMatch = /^(?:Digit|Numpad)([1-9])$/.exec(event.code);
		const numberInput = numberKeyMatch?.[1] ?? (/^[1-9]$/.test(event.key) ? event.key : null);
		if (numberInput !== null) {
			handleNumberInput(Number(numberInput));
		}

		if (['Backspace', 'Delete'].includes(event.key)) {
			event.preventDefault();
			clearCells(selectedCells);
		}

		if (event.key === 'Escape') {
			clearSelection();
		}
	}
</script>

<svelte:window
	onpointerup={finishPointerGesture}
	onpointercancel={finishPointerGesture}
	onpointerdown={handleGlobalPointerDown}
	onkeydown={handleGlobalKeyDown}
/>

<!-- Keyboard interaction uses the grid's selection state through the window keydown handler. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="sudoku-grid"
	bind:this={gridElement}
	onpointermove={handlePointerMove}
	onpointerleave={() => (hoveredCell = null)}
>
	<div class="grid-layer cell-background-layer" aria-hidden="true">
		{#each gridStateRows as row (row[0].rowNumber0based)}
			{#each row as cell (cell.boxNumber + '-' + cell.positionInBox)}
				<div
					class="cell-background"
					class:selected={cell.isSelected}
					class:hovered={hoveredCell === cell}
					class:candidate-revealed={hasRevealedCandidate(cell)}
					class:revealed={revealedNumber !== null && cell.fillNumber === revealedNumber}
					class:conflict={conflictingCells.has(cell)}
				></div>
			{/each}
		{/each}
	</div>

	<!-- Variant graphics such as arrows and whisper lines will live here. -->
	<svg
		class="grid-layer variant-layer"
		viewBox="0 0 9 9"
		preserveAspectRatio="none"
		aria-hidden="true"
	></svg>

	<svg class="grid-layer selection-layer" aria-hidden="true">
		{#each gridStateRows as row (row[0].rowNumber0based)}
			{#each row as cell (cell.boxNumber + '-' + cell.positionInBox)}
				{@const cellRow = cell.rowNumber0based}
				{@const cellCol = cell.colNumber0based}
				{@const cellLeft = gridPercent(cellCol)}
				{@const cellTop = gridPercent(cellRow)}
				{@const cellRight = gridPercent(cellCol + 1)}
				{@const cellBottom = gridPercent(cellRow + 1)}
				{#if cell.isSelected}
					{#if !isCellSelected(cellRow - 1, cellCol)}
						<rect
							class="selection-segment horizontal"
							class:box-y={cellRow % 3 === 0}
							data-selection-side="top"
							data-row={cellRow}
							data-col={cellCol}
							x={cellLeft}
							y={cellTop}
							width={cellSpan}
						></rect>
					{/if}
					{#if !isCellSelected(cellRow, cellCol + 1)}
						<rect
							class="selection-segment vertical shift-left"
							class:box-x={(cellCol + 1) % 3 === 0}
							data-selection-side="right"
							data-row={cellRow}
							data-col={cellCol}
							x={cellRight}
							y={cellTop}
							height={cellSpan}
						></rect>
					{/if}
					{#if !isCellSelected(cellRow + 1, cellCol)}
						<rect
							class="selection-segment horizontal shift-up"
							class:box-y={(cellRow + 1) % 3 === 0}
							data-selection-side="bottom"
							data-row={cellRow}
							data-col={cellCol}
							x={cellLeft}
							y={cellBottom}
							width={cellSpan}
						></rect>
					{/if}
					{#if !isCellSelected(cellRow, cellCol - 1)}
						<rect
							class="selection-segment vertical"
							class:box-x={cellCol % 3 === 0}
							data-selection-side="left"
							data-row={cellRow}
							data-col={cellCol}
							x={cellLeft}
							y={cellTop}
							height={cellSpan}
						></rect>
					{/if}

					{#if isCellSelected(cellRow - 1, cellCol) && isCellSelected(cellRow, cellCol - 1) && !isCellSelected(cellRow - 1, cellCol - 1)}
						<rect
							class="selection-corner"
							class:box-x={cellCol % 3 === 0}
							class:box-y={cellRow % 3 === 0}
							x={cellLeft}
							y={cellTop}
						></rect>
					{/if}
					{#if isCellSelected(cellRow - 1, cellCol) && isCellSelected(cellRow, cellCol + 1) && !isCellSelected(cellRow - 1, cellCol + 1)}
						<rect
							class="selection-corner shift-left"
							class:box-x={(cellCol + 1) % 3 === 0}
							class:box-y={cellRow % 3 === 0}
							x={cellRight}
							y={cellTop}
						></rect>
					{/if}
					{#if isCellSelected(cellRow + 1, cellCol) && isCellSelected(cellRow, cellCol - 1) && !isCellSelected(cellRow + 1, cellCol - 1)}
						<rect
							class="selection-corner shift-up"
							class:box-x={cellCol % 3 === 0}
							class:box-y={(cellRow + 1) % 3 === 0}
							x={cellLeft}
							y={cellBottom}
						></rect>
					{/if}
					{#if isCellSelected(cellRow + 1, cellCol) && isCellSelected(cellRow, cellCol + 1) && !isCellSelected(cellRow + 1, cellCol + 1)}
						<rect
							class="selection-corner shift-left shift-up"
							class:box-x={(cellCol + 1) % 3 === 0}
							class:box-y={(cellRow + 1) % 3 === 0}
							x={cellRight}
							y={cellBottom}
						></rect>
					{/if}
				{/if}
			{/each}
		{/each}
	</svg>

	<svg
		class="grid-layer grid-line-layer"
		viewBox="0 0 9 9"
		preserveAspectRatio="none"
		aria-hidden="true"
	>
		{#each innerGridLines as line (line)}
			<line class="grid-line" class:box-line={line % 3 === 0} x1={line} y1="0" x2={line} y2="9"
			></line>
			<line class="grid-line" class:box-line={line % 3 === 0} x1="0" y1={line} x2="9" y2={line}
			></line>
		{/each}
		<rect class="outer-grid-border" x="0" y="0" width="9" height="9"></rect>
	</svg>

	<div class="grid-layer cell-content-layer">
		{#each gridStateRows as row (row[0].rowNumber0based)}
			{#each row as cell (cell.boxNumber + '-' + cell.positionInBox)}
				<!-- Keyboard interaction uses the grid's selection state through the window keydown handler. -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="sudoku-cell"
					data-box-index={cell.boxNumber - 1}
					data-cell-index={cell.positionInBox - 1}
					onpointerdown={(event) =>
						handlePointerDown(event, cell.boxNumber - 1, cell.positionInBox - 1)}
					bind:this={cell.element}
					bind:clientWidth={cell.width}
					bind:clientHeight={cell.height}
				>
					{#if cell.fillNumber !== null}
						<div class="value-container">
							<span
								class="value text-text cascadia-code"
								class:value-clue={cell.isClue && puzzlePhase !== 'setup'}
								class:value-entry={!cell.isClue && puzzlePhase !== 'setup'}
								data-value-kind={cell.isClue ? 'clue' : 'entry'}
								class:value-revealed={revealedNumber !== null && cell.fillNumber === revealedNumber}
								class:value-conflict={conflictingCells.has(cell)}>{cell.fillNumber}</span
							>
						</div>
					{:else}
						<div
							class="candidate-grid"
							class:candidates-hidden={!showCandidates}
							aria-hidden={!showCandidates}
						>
							{#each candidateInts as num (num)}
								{@const candidateIndex = keypadInts.indexOf(num)}
								{@const candidateVisible =
									cell.candidates[candidateIndex] || cell.manuallyAddedCandidates[candidateIndex]}
								{@const candidateInvalid =
									cell.manuallyAddedCandidates[candidateIndex] && !cell.candidates[candidateIndex]}
								<span
									class="candidate text-text-grayed cascadia-code"
									class:candidate-hidden={!candidateVisible}
									class:candidate-crossed-out={cell.crossedOutCandidates[candidateIndex]}
									class:candidate-bold={cell.boldCandidates[candidateIndex]}
									class:candidate-invalid={candidateInvalid}
									class:candidate-revealed={num === revealedNumber &&
										candidateVisible &&
										!candidateInvalid &&
										!cell.crossedOutCandidates[candidateIndex]}
									aria-hidden={!showCandidates || !candidateVisible}
									data-candidate={num}><span class="candidate-text">{num}</span></span
								>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		{/each}
	</div>
</div>

<style lang="scss">
	.sudoku-grid {
		position: relative;
		isolation: isolate;
		container-type: inline-size;
		--cell-border-size: clamp(1px, 0.2cqi, 2px);
		--half-cell-border-size: calc(var(--cell-border-size) / 2);
		--box-border-size: clamp(3px, 0.52cqi, 5px);
		--half-box-border-size: calc(var(--box-border-size) / 2);
		--selection-visible-size: clamp(2px, 0.42cqi, 4px);
		--cell-selection-depth: calc(var(--selection-visible-size) + var(--half-cell-border-size));
		--box-selection-depth: calc(var(--selection-visible-size) + var(--half-box-border-size));
		width: 100%;
		height: 100%;
		background-color: var(--color-background-lightest);
		touch-action: none;
	}

	.grid-layer {
		position: absolute;
		top: var(--half-box-border-size);
		left: var(--half-box-border-size);
		width: calc(100% - var(--box-border-size));
		height: calc(100% - var(--box-border-size));
	}

	.cell-background-layer,
	.cell-content-layer {
		display: grid;
		grid-template: repeat(9, 1fr) / repeat(9, 1fr);
	}

	.cell-background-layer {
		z-index: 0;
	}

	.cell-background {
		min-width: 0;
		min-height: 0;
		background-color: var(--color-background-lightest);
	}

	.cell-background.selected,
	.cell-background.hovered {
		background-color: var(--color-background);
	}

	.cell-background.selected.hovered {
		background-color: var(--color-accent-lighter);
	}

	.cell-background.candidate-revealed {
		background-color: var(--color-background-dark);
	}

	.cell-background.revealed {
		background-color: var(--color-primary);
	}

	.cell-background.conflict {
		background-color: var(--color-secondary);
	}

	.variant-layer {
		z-index: 10;
	}

	.selection-layer {
		z-index: 20;
	}

	.selection-segment,
	.selection-corner {
		fill: var(--color-accent);
		shape-rendering: crispEdges;
	}

	.selection-segment.horizontal {
		height: var(--cell-selection-depth);
	}

	.selection-segment.horizontal.box-y {
		height: var(--box-selection-depth);
	}

	.selection-segment.vertical {
		width: var(--cell-selection-depth);
	}

	.selection-segment.vertical.box-x {
		width: var(--box-selection-depth);
	}

	.selection-corner {
		width: var(--cell-selection-depth);
		height: var(--cell-selection-depth);
	}

	.selection-corner.box-x {
		width: var(--box-selection-depth);
	}

	.selection-corner.box-y {
		height: var(--box-selection-depth);
	}

	.shift-left,
	.shift-up {
		transform-box: fill-box;
	}

	.shift-left {
		transform: translateX(-100%);
	}

	.shift-up {
		transform: translateY(-100%);
	}

	.shift-left.shift-up {
		transform: translate(-100%, -100%);
	}

	.grid-line-layer {
		z-index: 30;
		overflow: visible;
	}

	.variant-layer,
	.selection-layer,
	.grid-line-layer {
		pointer-events: none;
	}

	.grid-line {
		stroke: var(--color-text-grayed);
		stroke-width: var(--cell-border-size);
		vector-effect: non-scaling-stroke;
		shape-rendering: crispEdges;
	}

	.grid-line.box-line {
		stroke: var(--color-primary-light);
		stroke-width: var(--box-border-size);
	}

	.outer-grid-border {
		fill: none;
		stroke: var(--color-primary-light);
		stroke-width: var(--box-border-size);
		stroke-linejoin: miter;
		vector-effect: non-scaling-stroke;
		shape-rendering: crispEdges;
	}

	.cell-content-layer {
		z-index: 40;
	}

	.sudoku-cell {
		min-width: 0;
		min-height: 0;
		background-color: transparent;
		user-select: none;
	}

	.value-container {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
	}

	.value {
		font-size: clamp(1.25rem, 7cqi, 4.5rem);
	}

	.value-clue {
		color: var(--color-primary);
		font-weight: 700;
	}

	.value-entry {
		font-weight: 400;
	}

	.value-revealed {
		color: var(--color-background-lightest);
	}

	.value-conflict {
		color: var(--color-background-lightest);
	}

	.candidate-grid {
		width: 100%;
		height: 100%;
		padding-block: 0.5cqi;
		display: grid;
		grid-template: 1fr 1fr 1fr / 1fr 1fr 1fr;
	}

	.candidates-hidden {
		visibility: hidden;
	}
	.candidate {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
		font-size: clamp(0.5rem, 2.4cqi, 1.1rem);
	}

	.candidate-text {
		max-width: 100%;
		max-height: 100%;
	}

	.candidate-crossed-out {
		opacity: 0.45;
	}

	.candidate-crossed-out::after {
		content: '';
		position: absolute;
		z-index: 1;
		top: 50%;
		left: 50%;
		width: 65%;
		border-top: 0.1rem solid var(--color-secondary-muted);
		transform: translate(-50%, -50%) rotate(35deg);
		pointer-events: none;
	}

	.candidate-bold {
		color: var(--color-accent);
		font-weight: bold;
	}

	.candidate-bold.candidate-crossed-out {
		color: var(--color-text-grayed);
		font-weight: 400;
	}

	.candidate-revealed .candidate-text {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 1.25em;
		min-height: 1.25em;
		padding: 0.05em;
		color: var(--color-background-lightest);
		background-color: var(--color-primary);
		box-sizing: border-box;
	}

	.candidate-invalid .candidate-text {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 1.25em;
		min-height: 1.25em;
		padding: 0.05em;
		color: var(--color-background-lightest);
		background-color: var(--color-secondary);
		box-sizing: border-box;
	}

	.candidate-hidden {
		visibility: hidden;
	}
</style>
