<script lang="ts">
	import IsometricBorder from "./IsometricBorder.svelte";
	import KeypadButton from "./KeypadButton.svelte";
	import RadioButtons from "./RadioButtons.svelte";
    import SudokuGrid from "./SudokuGrid.svelte";
    import TextSwitch from "./TextSwitch.svelte";
    import { MediaQuery } from 'svelte/reactivity';
    // import type {Snippet} from 'svelte';

    let panelText = $state("");
    let displayedPanel = $state("Keypad");

    const smallerThanDesktop = new MediaQuery('max-width: 1615px');
    // const smallerThanDesktop = false;

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


    const keypadNumbers = ["7","8","9","4","5","6","1","2","3"];
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
            <SudokuGrid/>
        </IsometricBorder>
    </div>

    {#if displayedPanel === 'Keypad' || !smallerThanDesktop.current}
        <div class="right-panel">
            <h1 class="text-primary cascadia-code">Keypad</h1>
            <div class="keypad">
                {#each keypadNumbers as num}
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
