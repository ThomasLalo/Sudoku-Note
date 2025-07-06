<script lang="ts">
    import IsometricBorder from "./IsometricBorder.svelte";

    const keypadNumbers = [7,8,9,4,5,6,1,2,3];
    const invertedKeypadNumbers = [1,2,3,4,5,6,7,8,9];
    const cellBorders = [['border-bottom','border-right'],['border-bottom','border-right'],['border-bottom'],['border-bottom','border-right'],['border-bottom','border-right'],['border-bottom'],['border-right'],['border-right'],[]];
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
    
        function addBorders(borderColor : string, borderSize:string, borderPositions : string[][], elementNumber: number): string {

        let returnString: string = "";
        for (let borderString of borderPositions[elementNumber]) {
            if (borderString !== '') {
                returnString += borderString + ": "+borderSize+"vmin solid var(" + borderColor + "); "
            }
        }
        return returnString;
    };
</script>

<div class="sudoku-grid">
    {#each {length:9}, boxNumber }
        <div class="sudoku-box border-primary" style="{addBorders("--color-primary-light", "0.4", boxBorders, boxNumber)}">
            {#each {length:9}, cellNumber }
                <div class="sudoku-cell bg-background-lightest border-text-grayed" style="{addBorders("--color-text-grayed", "0.25", cellBorders, cellNumber)}">
                    {#each keypadNumbers as num}
                        <span class="candidate text-text-grayed cascadia-code"> {num} </span>
                    {/each}
                </div>
            {/each}
        </div>
    {/each}
</div>


<style lang="scss">
    .sudoku-grid {
        width: 100%;
        height: 100%;
        display: grid;
        grid-template: 1fr 1fr 1fr / 1fr 1fr 1fr;
        // box-shadow: 1vmin 1vmin var(--color-secondary-light);
    }

    .sudoku-box {
        display: grid;
        grid-template: 1fr 1fr 1fr / 1fr 1fr 1fr;
        // border: 3px solid var(--color-primary);
    }

    .sudoku-cell {
        display: grid;
        grid-template: 1fr 1fr 1fr / 1fr 1fr 1fr;
        // border: 1px solid var(--color-text-grayed);
    }

    .candidate {
        display: flex;
        align-items: center;
        justify-content: center;
    }
</style>