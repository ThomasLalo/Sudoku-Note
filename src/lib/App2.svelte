<script lang="ts">
	import IsometricBorder from "./IsometricBorder.svelte";
	import KeypadButton from "./KeypadButton.svelte";
	import RadioButtons from "./RadioButtons.svelte";
    import SudokuGrid from "./SudokuGrid.svelte";
    import TextSwitch from "./TextSwitch.svelte";
    import { MediaQuery } from 'svelte/reactivity';
    import type { Cell } from "./gridUtils";
    import { initializeGrid, getAdjacentCell } from "./gridUtils";
    // import type {Snippet} from 'svelte';

    const keypadInts = [7,8,9,4,5,6,1,2,3];
    const smallerThanDesktop = new MediaQuery('max-width: 1615px');
    // const smallerThanDesktop = false;

    let panelText = $state("");
    let displayedPanel = $state("Keypad");
    let gridState:Cell[][] = $state(initializeGrid());
    let selectedCells:Cell[] = $state([]);
    let lastSelected:Cell = $derived(gridState[0][0]);
    let gridStateRows:Cell[][] = $derived(reorganizeGrid(gridState)); // 0 based
    let gridStateCols:Cell[][] = $derived(gridStateRows[0].map((_,colIndex) => gridStateRows.map(row => row[colIndex])));

    function reorganizeGrid(boxGrid:Cell[][]) {
        const rowGrid:Cell[][] = [[],[],[],[],[],[],[],[],[]];
        for (const [boxIndex,box] of boxGrid.entries()) { // for each box of the grid
            if ([0,1,2].includes(boxIndex)) { // if the box is box 1,2, or 3, but 0 based
                rowGrid[0].push(...box.slice(0,3)); // builds row 1 with [[1,1], [1,2], [1,3]],..
                rowGrid[1].push(...box.slice(3,6)); // builds row 2
                rowGrid[2].push(...box.slice(6,9)); // builds row 3
            }
            if ([3,4,5].includes(boxIndex)) { // boxes 4,5,6
                rowGrid[3].push(...box.slice(0,3)); // 4
                rowGrid[4].push(...box.slice(3,6)); // 5
                rowGrid[5].push(...box.slice(6,9)); // 6
            }
            if ([6,7,8].includes(boxIndex)) {  // boxes 7,8,9
                rowGrid[6].push(...box.slice(0,3)); // 7
                rowGrid[7].push(...box.slice(3,6)); // 8
                rowGrid[8].push(...box.slice(6,9)); // 9
            }
        }
        return rowGrid; // 0 based
    }

    function getSeenCells(originCell:Cell){ 
        // const merged = [...new Set([...array1, ...array2])];
        // take box, row, and col and put them in a Set which removes duplicates, and convert the set back to an array
        const visibileCells:Cell[] = [... new Set([
            ...gridState[originCell.boxNumber - 1],
            ...gridStateRows[originCell.rowNumber0based],
            ...gridStateCols[originCell.colNumber0based]
        ])];
        return visibileCells
    }

    function fillCell(targetCell:Cell, fillValue:number) {
        // console.log("fillCell ran")
        targetCell.fillNumber = fillValue;
        const seenCells = getSeenCells(targetCell);
        for (const cell of seenCells!) { // cells will always exist and see eachother
            cell.candidates[keypadInts.indexOf(fillValue)] = false;
        }
    }

    function setPanelText() {
        if (panelText === "") {
            panelText = ":)";
        } else {
            panelText = "";
        }
    }

    $effect(() => {
        console.log(displayedPanel); // the effect is only for this, I don't think I'll need it later.
    });


    const keypadStrings = ["7","8","9","4","5","6","1","2","3"];
    const panelLabels = ["Keypad","Info"];
</script>

<div class="app-container">
    {#if displayedPanel === 'Info' || !smallerThanDesktop.current}
    <div class="left-panel">
        <h1 class="text-primary cascadia-code">Lorem ipsum</h1>
        <p class="text-text cascadia-code">dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum</p>
        <p class="text-text cascadia-code">{panelText}</p>
    </div>
    {/if}


    <div class="sudoku-grid-container">
        <IsometricBorder color="primary">
            <SudokuGrid bind:gridState bind:selectedCells bind:lastSelected {fillCell}/>
        </IsometricBorder>
    </div>

    {#if displayedPanel === 'Keypad' || !smallerThanDesktop.current}
        <div class="right-panel">
            <h1 class="text-primary cascadia-code">Keypad</h1>
            <div class="keypad">
                {#each keypadStrings as num}
                    <KeypadButton label={num} color="primary" toggle={false} onchangeHandler={setPanelText}/>
                {/each}
                <KeypadButton label="D" color="secondary" toggle={false} onchangeHandler={setPanelText}/>
                <KeypadButton label="H" color="accent" toggle={false} onchangeHandler={setPanelText}/>
                <KeypadButton label="W" color="text" toggle={false} onchangeHandler={setPanelText}/>
            </div>
        </div>
    {/if}

        <div class="layout-button-container">
            <!-- I need to make these radio buttons. I think there should be a radio buttons container component that will create the set of buttons instead of each
            button being its own component-->
            <!-- <TextSwitch label={"keypad"} onchangeHandler={setPanelText} />
            <TextSwitch label={"info"} onchangeHandler={setPanelText} /> -->
            <RadioButtons labels={panelLabels} bind:binder={displayedPanel} />
        </div>


</div>

<style lang="scss">
    .app-container {
        --horizontal-margin: 1vmin;

        display: grid;
        grid-template-areas: "info sudoku keypad";
        grid-template-columns: 1fr auto 1fr;
    }

    .left-panel {
        background-color: var(--color-secondary);
        padding: 0.5vw;
        margin-left: var(--horizontal-margin);

        grid-area: info;
    }

    .sudoku-grid-container {
        aspect-ratio: 1;
        height: 81vh;
        width: 81vh;
        margin-right: var(--panel-border-width);
        margin-left: var(--horizontal-margin);

        grid-area: sudoku;
    }

    .right-panel {
        background-color: var(--color-accent);
        padding: 0.5vw;
        margin-right: var(--horizontal-margin);
        margin-left: var(--horizontal-margin);

        grid-area: keypad;
    }

    .keypad {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1rem;
        // max-width: fit-content;
    }
    .layout-button-container{
        display: none;
        grid-area: button;
    }

@media (max-width: 1615px) { //tablet landscape
    .app-container {
        grid-template-columns: auto 1fr;
        grid-template-rows: auto 1fr;
        grid-template-areas:
        "sudoku button button"
        "sudoku keypad info"
        ;

    }
    .layout-button-container{
        display: flex;
        margin-bottom: calc(var(--horizontal-margin) * 2);
        margin-left: var(--horizontal-margin);
        gap: 2vmin;
        // justify-self: end;
    }

    .left-panel{
        margin-right: var(--horizontal-margin);
    }
}

@media(max-width: 1080px) {
    .sudoku-grid-container {
        height: 72vh;
        width: 72vh;
    }
}

@media(max-width: 1000px) {
    .sudoku-grid-container {
        height: 63vh;
        width: 63vh;
    }
}

@media(max-width: 1000px) and (max-height:859px) {
    .sudoku-grid-container {
        font-size: 0.7rem;
    }
}

@media(max-width: 900px) {
    .app-container{
        grid-template-rows: auto auto 1fr;
        grid-template-areas: 
        "sudoku"
        "button"
        "keypad"
        "info";
    }

    .sudoku-grid-container {
        height: 54vh;
        width: 54vh;
        font-size: 0.7rem;
        // grid-row: span 1;
    }
    .layout-button-container{
        margin-top: 1rem;
    }
}

@media(max-width: 540px) {
    .app-container{
        grid-template-rows: auto auto 1fr;
        grid-template-areas: 
        "sudoku"
        "button"
        "keypad"
        "info";
    }

    .sudoku-grid-container {
        height: 95vw;
        width: 95vw;
        font-size: 0.7rem;
        // grid-row: span 1;
    }
    .layout-button-container{
        margin-top: 1rem;
    }
}
@media(max-width: 400px) and (max-height:700px) {
    .sudoku-grid-container {
        font-size: 0.5rem;
    }
    // .app-container {
    //     background-color: red !important;
    // }
}
@media(max-height:390px) {
    .app-container {
        grid-template-columns: auto 1fr;
        grid-template-rows: auto 1fr;
        grid-template-areas:
        "sudoku button button"
        "sudoku keypad info"
        ;
    }

    .sudoku-grid-container {
        height: 95vh;
        width: 95vh;
        font-size: 0.5rem;
        // grid-row: span 1;
    }
    .layout-button-container{
        margin-top: 1rem;
    }
}

// @media (max-width: 1214px) { // phone portrait

// }

// @media (max-height: 753px) and (max-width: 1209px) { //phone landscape
//     .app-container {
//         grid-template-columns: auto 1fr;
//         grid-template-rows: auto 1fr;
//         grid-template-areas:
//         "sudoku button button"
//         "sudoku keypad info"
//         ;

//     }
//     .sudoku-grid-container {
//         grid-row: span 2;
//     }
//     .layout-button-container{
//         display: flex;
//         margin-bottom: calc(var(--horizontal-margin) * 2);
//         margin-left: var(--horizontal-margin);
//         gap: 2vmin;
//         // justify-self: end;
//     }

//     .left-panel{
//         margin-right: var(--horizontal-margin);
//     }
// }
</style>
