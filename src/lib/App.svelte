<script lang="ts">
	import IsometricBorder from "./IsometricBorder.svelte";
    import SudokuGrid from "./SudokuGrid.svelte";
    import TextButton from "./TextButton.svelte";
    // import type {Snippet} from 'svelte';

</script>

<div class="app-container">


    <div class="side-container">
        <TextButton text="hide"/>
        <div class="panel-container left-panel-container">
            <IsometricBorder color = "secondary">
                <div class="panel">left panel</div>
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
                <div class="panel">right panel</div>
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
        width: 81vmin;
        height: 81vmin;
    }
    .side-container {
        height: 81vmin;
        display: flex;
        flex-direction: column;
    }

    .panel-container {
        height: 100%;
        
    }

    .left-panel-container {
        margin-right: 2vmin;
        margin-top: 2vmin;
    }

    .right-panel-container {
        margin-left: 2vmin;
        margin-right: 1vmin;
    }

    .panel{
        margin-bottom: 1vmin;
        padding: 1vmin;
    }

</style>
