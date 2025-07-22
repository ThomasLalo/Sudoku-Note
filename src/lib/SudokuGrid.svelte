<script lang="ts">
    import type { Cell } from "./gridUtils";
    import { getAdjacentCell } from "./gridUtils";
    import { untrack } from "svelte";
    const keypadInts = [7,8,9,4,5,6,1,2,3];
    const invertedKeypadInts = [1,2,3,4,5,6,7,8,9];

    let {gridState = $bindable(), selectedCells = $bindable(), lastSelected = $bindable(), fillCell}:
    {gridState: Cell[][], selectedCells: Cell[], lastSelected: Cell, fillCell: (targetCell:Cell, fillValue:number) => void} = $props();

    let dragSelecting:boolean = $state(false); // idk if I need to move this to App


    const cellBorders = [
        ['border-bottom','border-right'], // 0 
        ['border-bottom','border-right'], // 1 
        ['border-bottom'], // 2
        ['border-bottom','border-right'], // 3
        ['border-bottom','border-right'], // 4
        ['border-bottom'], // 5
        ['border-right'], // 6
        ['border-right'], // 7
        [] // 8
    ];
    const boxBorders = [
        ['border-top', 'border-left', 'border-bottom', 'border-right'], // 0
        ['border-top', 'border-bottom', 'border-right'], // 1
        ['border-top', 'border-bottom', 'border-right'], // 2
        ['border-left', 'border-bottom', 'border-right'], // 3
        ['border-bottom', 'border-right'], // 4
        ['border-bottom', 'border-right'], // 5
        ['border-left', 'border-bottom', 'border-right'], // 6
        ['border-bottom', 'border-right'], // 7
        ['border-bottom', 'border-right'] // 8
    ];

    function addBorders(borderColor : string, borderVar:string, elementType: string, elementNumber: number, targetBoxIndex?: number, targetCellIndex?:number): string {
        let borderPositions:string[][] = [];
        if (elementType === "cell") {
            const targetCell = gridState[targetBoxIndex!][targetCellIndex!]; // the if means its always exists
            borderPositions = cellBorders;

            // immutability is the source of all my frustration with programming. pure js would be less annoying at this point, then I wouldn't have to deal with these stupid conventions.
            // there is a zero percent chance I remake this with react
            // these values will never change, I just need them to be set and accessible from Cell objects in the gridState structure
            // if they never change then nothing needs to react to them changing and so they don't need to be tracked. 
            untrack( () => {
                if (borderPositions[elementNumber].includes("border-bottom")) {
                    targetCell.ownsBottomBorder = true; 
                }

                if (borderPositions[elementNumber].includes("border-right")) {
                    targetCell.ownsRightBorder = true;            
                }
            });
        }

        if (elementType === "box") {
            borderPositions = boxBorders;
        }

            let returnString: string = "";
        for (let borderString of borderPositions[elementNumber]) {
            if (borderString !== '') {
                returnString += borderString + ": "+borderVar+" solid var(" + borderColor + "); "
            }
        }
        return returnString;
    };


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
        <div class="sudoku-box border-primary" style="{addBorders("--color-primary-light", "var(--box-border-size)", "box", boxNumber)}">

            {#each {length:9}, cellNumber }
                <!-- {selectedCells.some(object => object.boxNumber === boxNumber + 1 && object.positionInBox === cellNumber + 1) ? "selected" : "" }" 
                this adds the selected utility class if this cell is in selected cells, by comparing the each block variables to cell object values-->
                <div 
                    class="sudoku-cell bg-background-lightest border-text-grayed
                        {selectedCells.some(object => object.boxNumber === boxNumber + 1 && object.positionInBox === cellNumber + 1) ? "selected" : "" }" 

                    style="{addBorders("--color-text-grayed", "var(--cell-border-size)", "cell", cellNumber, boxNumber, cellNumber)}" 
                    onmousedown={() => handleMouseDown(boxNumber,cellNumber)} 
                    onmouseenter={() => handleMouseEnter(boxNumber,cellNumber)}
                    onmouseup={handleMouseUp}
                    role="button"
                    tabindex="0"
                > <!-- I'm not sure about using tabindex like that, but it makes the warning go away. there might be a better way, but I'll figure that out later -->

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