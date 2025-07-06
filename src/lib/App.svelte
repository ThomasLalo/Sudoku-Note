<script lang="ts">
	import IsometricBorder from "./IsometricBorder.svelte";
	import KeypadButton from "./KeypadButton.svelte";
    import SudokuGrid from "./SudokuGrid.svelte";
    import TextButton from "./TextButton.svelte";
    // import type {Snippet} from 'svelte';

    let panelText = $state("");

    function setPanelText() {
        if (panelText === "") {
            panelText = ":)";
        } else {
            panelText = "";
        }
    }

    const keypadNumbers = ["7","8","9","4","5","6","1","2","3"];
</script>

<div class="app-container">
    <div class="side-container left-side-container">
        <div class="button-container">
            <TextButton text="Hide Info" toggle={true} onchangeHandler={setPanelText}/>
        </div>
        <div class="panel-container left-panel-container">
            <IsometricBorder color = "secondary">
                <div class="panel">left panel {panelText}</div>
            </IsometricBorder>
        </div>
    </div>


    <div class="grid-container">
        <IsometricBorder color="secondary">
            <SudokuGrid/>
        </IsometricBorder>
    </div>



        <div class="side-container">
        <div class="panel-container right-panel-container">
            <IsometricBorder color = "secondary">
                <div class="panel right-panel">
                    {#each keypadNumbers as num}
                        <KeypadButton text={num} color="text" toggle={false} onchangeHandler={setPanelText}/>
                    {/each}
                </div>
            </IsometricBorder>
        </div>
    </div>

    <!-- <div class="side-container">
        <div class="panel-container right-panel-container">
            {#snippet rightPanel()}
                <div class="panel">left panel</div>
            {/snippet}
            <IsometricBorder markup={rightPanel} color={"secondary"}/>
        </div>
    </div> -->

    <!-- <div class="panel right-panel bg-background-lightest text-primary cascadia-code">right panel</div> -->

</div>

<style lang="scss">
    
    .app-container{
        display: grid;
        grid-template-columns: 1fr auto 1fr;
    }
    .grid-container {
        width: var(--grid-size);
        height: var(--grid-size);
    }
    .side-container {
        height: var(--grid-size);
        display: flex;
        flex-direction: column;
    }

    .button-container {
        align-self: flex-end; //right aligns button
    }

    .panel-container {
        height: 100%;
        
    }

    .left-panel-container {
        margin-top: var(--margin-plus-button); // double --diagonal-length in TextButton.svelte
    }

    .left-side-container {
        margin-left: var(--margin-width);
        margin-right: var(--margin-plus-panel);

    }

    .right-panel-container {
        margin-left: var(--margin-plus-panel);
        margin-right: var(--margin-plus-panel);
    }

    .panel{
        padding: calc(var(--margin-width) / 2);
    }

    .right-panel {
        width: 40%;
        height: 40%;
        display: grid;
        grid-template: 1fr 1fr 1fr / 1fr 1fr 1fr;
    }
</style>
