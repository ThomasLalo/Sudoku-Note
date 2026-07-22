<script lang="ts">
    import type { Cell } from "./gridUtils";
    import { getAdjacentCell } from "./gridUtils";
    const keypadInts = [7,8,9,4,5,6,1,2,3];
    const flippedInts = [1,2,3,4,5,6,7,8,9];
    const innerGridLines = [1,2,3,4,5,6,7,8];
    const cellSpan = `${100 / 9}%`;

    let {gridState = $bindable(), gridStateRows = $bindable(), selectedCells = $bindable(), lastSelected = $bindable(), flippedNotes, revealedNumber, handleNumberInput, clearCells}:
    {gridState: Cell[][], gridStateRows: Cell[][], selectedCells: Cell[], lastSelected: Cell, flippedNotes: boolean, revealedNumber: number | null, handleNumberInput: (value:number) => void, clearCells: (targetCells:Cell[]) => void} = $props();

    let candidateInts = $derived(flippedNotes ? flippedInts : keypadInts);

    let dragAdding = false;
    let dragRemoving = false;
    let hoveredCell: Cell | null = $state(null);

    const isCellSelected = (row: number, col: number) =>
        gridStateRows[row]?.[col]?.isSelected ?? false;

    const gridPercent = (gridLine: number) => `${(gridLine / 9) * 100}%`;

    

    function clearSelection() {
        for (let cellObj of selectedCells) {
            cellObj.isSelected = false;
        }
        selectedCells = [];
    }

    function addToSelection(box:number,cell:number) {
        const cellObj = gridState[box][cell];
        cellObj.isSelected = true;
        selectedCells.push(cellObj);
        lastSelected = cellObj;
    }

    function removeFromSelection(box:number,cell:number) {
        const cellObj = gridState[box][cell];
        cellObj.isSelected = false;
        selectedCells = selectedCells.filter(value => value !== cellObj);
    }

    function handleMouseDown(event:MouseEvent, boxNumber:number, cellNumber:number) {
        const cellObj = gridState[boxNumber][cellNumber];
        if (!event.shiftKey) {
            clearSelection();
        }
        if (cellObj.isSelected) {
            dragRemoving = true;
            removeFromSelection(boxNumber,cellNumber);
        } else {
            dragAdding = true;
            addToSelection(boxNumber,cellNumber);
        }
    }

    function handleMouseEnter(boxNumber:number, cellNumber:number) {
        hoveredCell = gridState[boxNumber][cellNumber];
        if (dragAdding) {
            addToSelection(boxNumber,cellNumber);
        }
        if (dragRemoving) {
            removeFromSelection(boxNumber,cellNumber);
        }
    }

    function handleMouseLeave(cell: Cell) {
        if (hoveredCell === cell) hoveredCell = null;
    }

    function handleMouseUp() {
        dragAdding = false;
        dragRemoving = false;
        
    }

    function handleGlobalMouseUp() {
        dragAdding = false;
        dragRemoving = false;
    }

    let gridElement: HTMLDivElement | undefined; // grid element might be undefined when the page first loads. see the bind:this on sudoku-grid in the html
    function handleGlobalMouseDown(event:MouseEvent) {
        const target = event.target;
        if (target instanceof Node && gridElement?.contains(target)) {
            return;
        }
        if (target instanceof Element && target.closest('[data-preserve-grid-selection]')) {
            return;
        }
        clearSelection();
    }


    function handleGlobalKeyDown(event:KeyboardEvent) {
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
                addToSelection(newBox,newCellPos);

            } else { 
                // if nothing is selected then select the cell last previously selected
                // selectCell(lastSelected.boxNumber -1,lastSelected.positionInBox -1);
                addToSelection(lastSelected.boxNumber -1,lastSelected.positionInBox -1);
            }
        }

        if (['1','2','3','4','5','6','7','8','9'].includes(event.key)) {
            handleNumberInput(Number(event.key));
        }

        if (['Backspace','Delete'].includes(event.key)) {
            event.preventDefault();
            clearCells(selectedCells);
        }

        if (event.key === "Escape") {
            clearSelection();
        }
    }

</script>

<svelte:window onmouseup={handleGlobalMouseUp} onmousedown={handleGlobalMouseDown} onkeydown={handleGlobalKeyDown}/>

<div class="sudoku-grid" bind:this={gridElement}>
    <div class="grid-layer cell-background-layer" aria-hidden="true">
        {#each gridStateRows as row}
            {#each row as cell (cell.boxNumber + "-" + cell.positionInBox)}
                <div
                    class="cell-background"
                    class:selected={cell.isSelected}
                    class:hovered={hoveredCell === cell}
                    class:revealed={revealedNumber !== null && cell.fillNumber === revealedNumber}
                ></div>
            {/each}
        {/each}
    </div>

    <!-- Variant graphics such as arrows and whisper lines will live here. -->
    <svg class="grid-layer variant-layer" viewBox="0 0 9 9" preserveAspectRatio="none" aria-hidden="true"></svg>

    <svg class="grid-layer selection-layer" aria-hidden="true">
        {#each gridStateRows as row}
            {#each row as cell (cell.boxNumber + "-" + cell.positionInBox)}
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

    <svg class="grid-layer grid-line-layer" viewBox="0 0 9 9" preserveAspectRatio="none" aria-hidden="true">
        {#each innerGridLines as line}
            <line class="grid-line" class:box-line={line % 3 === 0} x1={line} y1="0" x2={line} y2="9"></line>
            <line class="grid-line" class:box-line={line % 3 === 0} x1="0" y1={line} x2="9" y2={line}></line>
        {/each}
        <rect class="outer-grid-border" x="0" y="0" width="9" height="9"></rect>
    </svg>

    <div class="grid-layer cell-content-layer">
        {#each gridStateRows as row}
            {#each row as cell (cell.boxNumber + "-" + cell.positionInBox)}
                <!-- Keyboard interaction uses the grid's selection state through the window keydown handler. -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div
                    class="sudoku-cell"
                    onmousedown={(event) => handleMouseDown(event, cell.boxNumber - 1, cell.positionInBox - 1)}
                    onmouseenter={() => handleMouseEnter(cell.boxNumber - 1, cell.positionInBox - 1)}
                    onmouseleave={() => handleMouseLeave(cell)}
                    onmouseup={handleMouseUp}
                    bind:this={cell.element}
                    bind:clientWidth={cell.width}
                    bind:clientHeight={cell.height}
                >
                    {#if cell.fillNumber !== null}
                        <div class="value-container">
                            <span
                                class="value text-text cascadia-code"
                                class:value-revealed={revealedNumber !== null && cell.fillNumber === revealedNumber}
                            >{cell.fillNumber}</span>
                        </div>
                    {:else}
                        <div class="candidate-grid">
                            {#each candidateInts as num}
                                <span
                                    class="candidate text-text-grayed cascadia-code"
                                    class:candidate-hidden={!cell.candidates[keypadInts.indexOf(num)]}
                                    class:candidate-crossed-out={cell.crossedOutCandidates[keypadInts.indexOf(num)]}
                                    class:candidate-bold={cell.boldCandidates[keypadInts.indexOf(num)]}
                                    class:candidate-revealed={num === revealedNumber && cell.candidates[keypadInts.indexOf(num)] && !cell.crossedOutCandidates[keypadInts.indexOf(num)]}
                                    aria-hidden={!cell.candidates[keypadInts.indexOf(num)]}
                                    data-candidate={num}
                                ><span class="candidate-text">{num}</span></span>
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
        --cell-border-size: 2px;
        --half-cell-border-size: 1px;
        --box-border-size: 5px;
        --half-box-border-size: 2.5px;
        --selection-visible-size: 4px;
        --cell-selection-depth: calc(var(--selection-visible-size) + var(--half-cell-border-size));
        --box-selection-depth: calc(var(--selection-visible-size) + var(--half-box-border-size));
        width: 100%;
        height: 100%;
        background-color: var(--color-background-lightest);
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

    .cell-background.revealed {
        background-color: var(--color-primary);
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
        font-size: 4rem;
    }

    .value-revealed {
        color: var(--color-background-lightest);
    }

    .candidate-grid {
        width: 100%;
        height: 100%;
        display: grid;
        grid-template: 1fr 1fr 1fr / 1fr 1fr 1fr;
    }
    .candidate {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
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

    .candidate-hidden {
        visibility: hidden;
    }

    @media(max-width: 450px) or (max-height:680px) {
        .sudoku-grid {
            --cell-border-size: 0.1rem;
            --half-cell-border-size: 0.05rem;
            --box-border-size: 0.2rem;
            --half-box-border-size: 0.1rem;
        }
    }
</style>
