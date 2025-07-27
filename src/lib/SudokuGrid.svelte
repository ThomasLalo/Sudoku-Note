<script lang="ts">
    import type { Cell } from "./gridUtils";
    import { boxBorders, cellBorders, addBorders, getAdjacentCell } from "./gridUtils";
    const keypadInts = [7,8,9,4,5,6,1,2,3];
    const invertedKeypadInts = [1,2,3,4,5,6,7,8,9];

    let {gridState = $bindable(), gridStateRows = $bindable(), selectedCells = $bindable(), lastSelected = $bindable(), fillCell}:
    {gridState: Cell[][], gridStateRows: Cell[][], selectedCells: Cell[], lastSelected: Cell, fillCell: (targetCell:Cell, fillValue:number) => void} = $props();

    let dragAdding = false;
    let dragRemoving = false;
    // let cellsSelectedThisclick:Cell[] = [];

    function drawSelectionSVG() {
        let rectString = "";
        for (let selection of selectedCells) {
            const left = selection.element!.offsetLeft;
            const top = selection.element!.offsetTop;
            const width = selection.width;
            const height = selection.height;

            const row = selection.rowNumber0based;
            const col = selection.colNumber0based;
            if (row === 0 || !gridStateRows[row-1][col].isSelected) {
                rectString += `<rect x="${left}" y="${top}" width="${width}" height="5px" fill="var(--color-accent)" ></rect>`;
            }
            // Left neighbor - check if col-1 exists and if that cell is not selected
            if (col === 0 || !gridStateRows[row][col-1].isSelected) {
                rectString += `<rect x="${left}" y="${top}" width="5px" height="${height}" fill="var(--color-accent)" ></rect>`;
            }
            // Right neighbor - check if col+1 exists and if that cell is not selected
            if (col === gridStateRows[row].length - 1 || !gridStateRows[row][col+1].isSelected) {
                rectString += `<rect x="${left + width}" y="${top}" width="5px" height="${height}" fill="var(--color-accent)" ></rect>`;
            }
            // Bottom neighbor - check if row+1 exists and if that cell is not selected
            if (row === gridStateRows.length - 1 || !gridStateRows[row+1][col].isSelected) {
                rectString += `<rect x="${left}" y="${top + height}" width="${width}" height="5px" fill="var(--color-accent)" ></rect>`;
            }
        }
        return rectString;
    }

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
        if (dragAdding) {
            addToSelection(boxNumber,cellNumber);
        }
        if (dragRemoving) {
            removeFromSelection(boxNumber,cellNumber);
        }
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
        // DOM arcana. event.target doesn't have to be a DOM node. as Node tells typescript it will be a Node, and elements are Nodes
        // gridElement? ensures .contains() won't try to run on an undefined and throw an error
        if (gridElement?.contains(event.target as Node)) {
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

        if (['1','2','3','4','5','6','7','8','9'].includes(event.key) && selectedCells.length === 1) {
            // selectedCells[0].fillNumber = Number(event.key);
            fillCell(selectedCells[0], Number(event.key));
        }

        if (['Backspace','Delete'].includes(event.key)) {
            for (const cell of selectedCells) {
                cell.fillNumber = null; // this needs to be a function to reset candidates
            }
        }

        if (event.key === "Escape") {
            clearSelection();
        }
    }

</script>

<svelte:window onmouseup={handleGlobalMouseUp} onmousedown={handleGlobalMouseDown} onkeydown={handleGlobalKeyDown}/>

<div class="sudoku-grid" bind:this={gridElement}>

    {#each {length:9}, boxNumber }
        <div class="sudoku-box border-primary" style="{addBorders("--color-primary-light", "var(--box-border-size)", boxBorders, boxNumber)}">

            {#each {length:9}, cellNumber }
                <!-- {selectedCells.some(object => object.boxNumber === boxNumber + 1 && object.positionInBox === cellNumber + 1) ? "selected" : "" }" 
                this adds the selected utility class if this cell is in selected cells, by comparing the each block variables to cell object values-->
                <div 
                    class="sudoku-cell bg-background-lightest border-text-grayed
                        {selectedCells.some(object => object.boxNumber === boxNumber + 1 && object.positionInBox === cellNumber + 1) ? "selected" : "" }" 

                    style="{addBorders("--color-text-grayed", "var(--cell-border-size)", cellBorders, cellNumber)}" 
                    onmousedown={(event) => handleMouseDown(event, boxNumber, cellNumber)} 
                    onmouseenter={() => handleMouseEnter(boxNumber, cellNumber)}
                    onmouseup={handleMouseUp}
                    bind:this = {gridState[boxNumber][cellNumber].element}
                    bind:clientWidth = {gridState[boxNumber][cellNumber].width}
                    bind:clientHeight = {gridState[boxNumber][cellNumber].height}
                    role="button"
                    tabindex="0"
                >

                    {#if gridState[boxNumber][cellNumber].fillNumber !== null}
                        <div class="value-container">
                            <span class="value text-text cascadia-code">{gridState[boxNumber][cellNumber].fillNumber}</span>
                        </div>
                        
                    {:else}
                        <div class="candidate-grid">
                            {#each keypadInts as num, index}
                                {#if gridState[boxNumber][cellNumber].candidates[index]}
                                    <!-- so when a candidate is false, the grid layout reorder which is default css grid behavior 
                                    I could fix this by adding grid-areas though -->
                                    <span class="candidate text-text-grayed cascadia-code"> {num} </span> 
                                {/if}
                            {/each}
                        </div>
                    {/if}

                </div>
            {/each}

        </div>
    {/each}

    <svg class="svg-overlay">
        {@html drawSelectionSVG()}
    </svg>

</div>


<style lang="scss">    
    .sudoku-grid {
        position: relative;
        --cell-border-size: 2px;
        --box-border-size: 5px; // I need to figure out how to set this is ts. this value is used, but not with the var, in drawSelectionSVG
        --box-border-offset: calc(var( var(--box-border-size) + 9vh ));
        --box-border-edge: calc( var(--box-border-size) * 2 );
        width: 100%;
        height: 100%;
        display: grid;
        grid-template: 1fr 1fr 1fr / 1fr 1fr 1fr;
    }


    .svg-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
}


    .sudoku-box {
        display: grid;
        grid-template: 1fr 1fr 1fr / 1fr 1fr 1fr;
    }

    .sudoku-cell {
        user-select: none;
    }

    .sudoku-cell:hover {
        background-color: var(--color-background);
    }

    .selected {
        background-color: var(--color-background);
        // border: 0.2rem solid var(--color-accent) !important;
    //     box-shadow: 
    //         inset 0 0.2rem var(--color-accent), //top
    //         inset 0 -0.2rem var(--color-accent), //bottom
    //         inset 0.2rem 0 var(--color-accent), //left
    //         inset -0.2rem 0 var(--color-accent); //right
    }
    .selected:hover {
        background-color: var(--color-accent-lighter);
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

    .candidate-grid {
        width: 100%;
        height: 100%;
        display: grid;
        grid-template: 1fr 1fr 1fr / 1fr 1fr 1fr;
    }
    .candidate {
        display: flex;
        align-items: center;
        justify-content: center;
    }

    @media(max-width: 450px) or (max-height:680px) {
        .sudoku-grid {
            --cell-border-size: 0.1rem;
            --box-border-size: 0.2rem;
        }

}
</style>