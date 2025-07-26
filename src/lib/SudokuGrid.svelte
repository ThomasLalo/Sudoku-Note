<script lang="ts">
    import type { Cell } from "./gridUtils";
    import { getAdjacentCell } from "./gridUtils";
    import { untrack } from "svelte";
    const keypadInts = [7,8,9,4,5,6,1,2,3];
    const invertedKeypadInts = [1,2,3,4,5,6,7,8,9];

    let {gridState = $bindable(), gridStateRows = $bindable(), selectedCells = $bindable(), lastSelected = $bindable(), fillCell}:
    {gridState: Cell[][], gridStateRows: Cell[][], selectedCells: Cell[], lastSelected: Cell, fillCell: (targetCell:Cell, fillValue:number) => void} = $props();

    let dragSelecting:boolean = $state(false); // idk if I need to move this to App


    function addBorders( targetBoxIndex: number, targetCellIndex: number): string {

        const cell = gridState[targetBoxIndex][targetCellIndex];
        const { rowNumber1based: row, colNumber1based: col } = cell;
        const boxBorderSize = "var(--box-border-size)";
        let boxBorderColor = "var(--color-primary-light)";
        let cellBorderSize = "var(--cell-border-size)";
        let cellBorderColor = "var(--color-text-grayed)";
        const selectedColor = "var(--color-accent)";

        let borderStyles = "";

        if (cell.isSelected) {
            cellBorderSize = boxBorderSize;
            cellBorderColor = "var(--color-accent)";
            boxBorderColor = "var(--color-accent)";
        }

        // Apply the top grid border to the first row of cells.
        if (row === 1 || cell.isSelected) {
            borderStyles += `border-top: ${boxBorderSize} solid ${boxBorderColor}; `;
        }

        // Apply the left grid border to the first column of cells.
        if (col === 1 || cell.isSelected) {
            borderStyles += `border-left: ${boxBorderSize} solid ${boxBorderColor}; `;
        }

        // Apply a bottom border to every cell.
        // The border is thick for rows at the bottom of a box (3, 6, 9).
        if (cell.bottomNeighborSeleted) {
            borderStyles += `border-bottom: none; `;
        } else if (row % 3 === 0) {
            borderStyles += `border-bottom: ${boxBorderSize} solid ${boxBorderColor}; `;
        } else {
            // It's a thin border for all other internal rows.
            borderStyles += `border-bottom: ${cellBorderSize} solid ${cellBorderColor}; `;
        }

        // Apply a right border to every cell.
        // The border is thick for columns at the right edge of a box (3, 6, 9).
        if (cell.rightNeighborSelected) {
            borderStyles += `border-right: none; `;
        } else if (col % 3 === 0) {
            borderStyles += `border-right: ${boxBorderSize} solid ${boxBorderColor}; `;
        } else {
            // It's a thin border for all other internal columns.
            borderStyles += `border-right: ${cellBorderSize} solid ${cellBorderColor}; `;
        }

        return borderStyles;
    };



    function selectCell(box:number,cell:number) { // this needs work
        const cellObj = gridState[box][cell];
        const row = cellObj.rowNumber0based;
        const col = cellObj.colNumber0based;
        const isAlreadySelected = selectedCells.includes(cellObj);


        if (isAlreadySelected && !dragSelecting) {
            selectedCells = selectedCells.filter(value => value !== cellObj);
            cellObj.isSelected = false;
            if (row !== 0) {
                gridStateRows[row-1][col].bottomNeighborSeleted = false;
            }
            if (col !== 0) {
                gridStateRows[row][col-1].rightNeighborSelected = false;
            }
        } else if (!isAlreadySelected) {
            selectedCells.push(cellObj);
            lastSelected = cellObj;
            cellObj.isSelected = true;
            if (row !== 0) {
                gridStateRows[row-1][col].bottomNeighborSeleted = true;
            }
            if (col !== 0) {
                gridStateRows[row][col-1].rightNeighborSelected = true;
            }
        }
        // console.log("current selection:")
        // for (let sCell of selectedCells) {
        //     console.log("box:" + sCell.boxNumber.toString() + ","+ "cell:"+ sCell.positionInBox.toString() )
        // }
        // console.log("\n")
    }


    function handleMouseDown(boxNumber:number, cellNumber:number) {
        selectedCells = [];
        dragSelecting = true;
        selectCell(boxNumber,cellNumber);
    }
    function handleMouseEnter(boxNumber:number, cellNumber:number) {
        if (dragSelecting) {
            selectCell(boxNumber,cellNumber);
        }
    }
    function handleMouseUp() {
        dragSelecting = false;
    }

    function handleGlobalMouseUp() {
        dragSelecting = false;
    }

    let gridElement: HTMLDivElement | undefined; // grid element might be undefined when the page first loads. see the bind:this on sudoku-grid in the html
    function handleGlobalMouseDown(event:MouseEvent) {
        // DOM arcana. event.target doesn't have to be a DOM node. as Node tells typescript it will be a Node, and elements are Nodes
        // gridElement? ensures .contains() won't try to run on an undefined and throw an error
        if (gridElement?.contains(event.target as Node)) {
            return;
        }
        selectedCells = [];
    }


    function handleGlobalKeyDown(event:KeyboardEvent) {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
            event.preventDefault();

            
            if (selectedCells.length !== 0) {

                // ! is not .at() syntax. it is a non-null assertion, I'm telling typescript this cell will always exist. it will because of the if block
                const [newBox, newCellPos] = getAdjacentCell(selectedCells.at(-1)!, event.key);
                
                if (!event.shiftKey) { 
                    //only select multiple cells if shift is held down
                    selectedCells = [];
                }
                selectCell(newBox,newCellPos);

            } else { 
                // if nothing is selected then select the cell last previously selected
                selectCell(lastSelected.boxNumber -1,lastSelected.positionInBox -1);
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
            selectedCells = []; 
        }
    }

</script>

<svelte:window onmouseup={handleGlobalMouseUp} onmousedown={handleGlobalMouseDown} onkeydown={handleGlobalKeyDown}/>

<div class="sudoku-grid" bind:this={gridElement}>

    {#each {length:9}, boxNumber }
        <div class="sudoku-box border-primary">

            {#each {length:9}, cellNumber }
                <!-- {selectedCells.some(object => object.boxNumber === boxNumber + 1 && object.positionInBox === cellNumber + 1) ? "selected" : "" }" 
                this adds the selected utility class if this cell is in selected cells, by comparing the each block variables to cell object values-->
                <div 
                    class="sudoku-cell bg-background-lightest border-text-grayed
                        {selectedCells.some(object => object.boxNumber === boxNumber + 1 && object.positionInBox === cellNumber + 1) ? "selected" : "" }" 

                    style="{ addBorders(boxNumber, cellNumber) }" 
                    onmousedown={() => handleMouseDown(boxNumber,cellNumber)} 
                    onmouseenter={() => handleMouseEnter(boxNumber,cellNumber)}
                    onmouseup={handleMouseUp}
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

</div>



<style lang="scss">    
    .sudoku-grid {
        --cell-border-size: 0.15rem;
        --box-border-size: 0.3rem;
        width: 100%;
        height: 100%;
        display: grid;
        grid-template: 1fr 1fr 1fr / 1fr 1fr 1fr;
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