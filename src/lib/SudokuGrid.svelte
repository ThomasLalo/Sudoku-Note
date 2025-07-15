<script lang="ts">
    import type { Cell } from "./gridUtils";
    import { oneBasedLookUpTable, boxBorders, cellBorders, addBorders, initializeGrid } from "./gridUtils";
    const keypadNumbers = [7,8,9,4,5,6,1,2,3];
    const invertedKeypadNumbers = [1,2,3,4,5,6,7,8,9];

    
    let gridState:Cell[][] = $state(initializeGrid());
    let selectedCells:Cell[] = $state([]);

    function selectCell(box:number,cell:number) {
        if (selectedCells.includes(gridState[box][cell])) {
            selectedCells = selectedCells.filter(value => value !== gridState[box][cell]);
        } else {
            selectedCells.push(gridState[box][cell]);
        }
    }

</script>

<div class="sudoku-grid">

    {#each {length:9}, boxNumber }
        <div class="sudoku-box border-primary" style="{addBorders("--color-primary-light", "var(--box-border-size)", boxBorders, boxNumber)}">

            {#each {length:9}, cellNumber }
                <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
                <div 
                    class="sudoku-cell bg-background-lightest border-text-grayed
                        {selectedCells.some(object => object.boxNumber === boxNumber+1&& object.positionInBox === cellNumber+1) ? "selected" : "" }"

                    style="{addBorders("--color-text-grayed", "var(--cell-border-size)", cellBorders, cellNumber)}" 

                    onclick={() => selectCell(boxNumber, cellNumber)}>

                    {#if gridState[boxNumber][cellNumber].isfilled}
                        <span class="value text-text cascadia-code">{gridState[boxNumber][cellNumber].fillNumber}</span>
                    {:else}

                        {#each keypadNumbers as num}
                            {#if !gridState[boxNumber][cellNumber].candidates[num]}
                                <span class="candidate text-text-grayed cascadia-code"> {num} </span>
                            {/if}
                        {/each}
                        
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
        display: grid;
        grid-template: 1fr 1fr 1fr / 1fr 1fr 1fr;
        user-select: none;
    }

    .sudoku-cell:hover {
        background-color: var(--color-background);
    }

    .selected {
        background-color: var(--color-background);
        box-shadow: 
            inset 0 0.2rem var(--color-accent), //top
            inset 0 -0.2rem var(--color-accent), //bottom
            inset 0.2rem 0 var(--color-accent), //left
            inset -0.2rem 0 var(--color-accent); //right
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