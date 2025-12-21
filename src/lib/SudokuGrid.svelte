<script lang="ts">
    import type { Cell } from "./gridUtils";
    import { boxBorders, cellBorders, addBorders, getAdjacentCell } from "./gridUtils";
    const keypadInts = [7,8,9,4,5,6,1,2,3];
    const invertedKeypadInts = [1,2,3,4,5,6,7,8,9];

    let {gridState = $bindable(), selectedCells = $bindable(), lastSelected = $bindable(), fillCell}:
    {gridState: Cell[][], selectedCells: Cell[], lastSelected: Cell, fillCell: (targetCell:Cell, fillValue:number) => void} = $props();

    let dragSelecting:boolean = $state(false); // idk if I need to move this to App

    function selectCell(box:number,cell:number) { // this needs work
        const cellObj = gridState[box][cell];
        const isSelected = selectedCells.includes(cellObj);

        if (isSelected && !dragSelecting) { 
            selectedCells = selectedCells.filter(value => value !== cellObj);
        } else if (!isSelected) {
            selectedCells.push(cellObj);
            lastSelected = cellObj;
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
        // DOM arcana. event.tagret doesn't have to be a DOM node. as Node tells typescript it will be a Node, and elements are Nodes
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

                // ! is not .at() syntax. it is a non-null assertion, I'm telling typescript this cell will always exist. it will becasue of the if block
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
        <div class="sudoku-box border-primary" style="{addBorders("--color-primary-light", "var(--box-border-size)", boxBorders, boxNumber)}">

            {#each {length:9}, cellNumber }
                <!-- {selectedCells.some(object => object.boxNumber === boxNumber + 1 && object.positionInBox === cellNumber + 1) ? "selected" : "" }" 
                this adds the selected utility class if this cell is in selected cells, by comparing the each block variables to cell object values-->
                <div 
                    class="sudoku-cell bg-background-lightest border-text-grayed
                        {selectedCells.some(object => object.boxNumber === boxNumber + 1 && object.positionInBox === cellNumber + 1) ? "selected" : "" }" 

                    style="{addBorders("--color-text-grayed", "var(--cell-border-size)", cellBorders, cellNumber)}" 
                    onmousedown={() => handleMouseDown(boxNumber,cellNumber)} 
                    onmouseenter={() => handleMouseEnter(boxNumber,cellNumber)}
                    onmouseup={handleMouseUp}
                    role="button"
                    tabindex="0"
                > <!-- I'm not sure about using tabindex like that, but it makes the warning go away. there might be a better way, but I'll figure that out later -->

                    {#if gridState[boxNumber][cellNumber].fillNumber !== null}
                        <div class="value-contianer">
                            <span class="value text-text cascadia-code">{gridState[boxNumber][cellNumber].fillNumber}</span>
                        </div>
                        
                    {:else}
                        <div class="candidate-grid">
                            {#each keypadInts as num, index}
                                {#if gridState[boxNumber][cellNumber].candidates[index]}
                                    <!-- so when a candidate is false, the grid layout reorder which is default css grid behaviour 
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
        <!-- <rect x="0" y="0" width="9vh" height="var(--box-border-size)" fill="var(--color-accent)" ></rect>
        <rect x="0" y="0" width="var(--box-border-size)" height="9vh" fill="var(--color-accent)" ></rect>
        <rect x="0" y="9vh" width="9vh" height="var(--box-border-size)" fill="var(--color-accent)" ></rect>
        <rect x="9vh" y="0" width="var(--box-border-size)" height="9vh" fill="var(--color-accent)" ></rect> -->

        <rect x="9vh" y="9vh" width="9vh" height="var(--box-border-size)" fill="black" ></rect>
        <rect x="9vh" y="9vh" width="var(--box-border-size)" height="9vh" fill="black" ></rect>
        <rect x="9vh" y="18vh" width="9vh" height="var(--box-border-size)" fill="black" ></rect>
        <rect x="18vh" y="9vh" width="var(--box-border-size)" height="9vh" fill="black" ></rect>
        <!-- <line x1="0" y1="0" x2="9vh" y2="0" stroke="var(--color-accent)" stroke-width="var(--box-border-edge)"/> 
        <line x1="0" y1="0" x2="0" y2="9vh" stroke="var(--color-accent)" stroke-width="var(--box-border-edge)"/>
        <line x1="9vh" y1="0" x2="9vh" y2="9vh" stroke="var(--color-accent)" stroke-width="var(--box-border-size)"/>
        <line x1="0" y1="9vh" x2="9vh" y2="9vh" stroke="var(--color-accent)" stroke-width="var(--box-border-size)"/> -->

        <!-- <line x1="72vh" y1="72vh" x2="81vh" y2="72vh" stroke="var(--color-accent)" stroke-width="var(--box-border-size)"/>
        <line x1="72vh" y1="72vh" x2="72vh" y2="81vh" stroke="var(--color-accent)" stroke-width="var(--box-border-size)"/>
        <line x1="81vh" y1="72vh" x2="81vh" y2="81vh" stroke="var(--color-accent)" stroke-width="var(--box-border-edge)"/>
        <line x1="72vh" y1="81vh" x2="81vh" y2="81vh" stroke="var(--color-accent)" stroke-width="var(--box-border-edge)"/> -->
    </svg>

</div>



<style lang="scss">    
    .sudoku-grid {
        position: relative;
        --cell-border-size: 0.15rem;
        --box-border-size: 0.3rem;
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
        border: 0.2rem solid var(--color-accent) !important;
    //     box-shadow: 
    //         inset 0 0.2rem var(--color-accent), //top
    //         inset 0 -0.2rem var(--color-accent), //bottom
    //         inset 0.2rem 0 var(--color-accent), //left
    //         inset -0.2rem 0 var(--color-accent); //right
    }
    .selected:hover {
        background-color: var(--color-accent-lighter);
    }

    .value-contianer {
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