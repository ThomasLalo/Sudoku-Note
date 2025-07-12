<script lang="ts">
    const keypadNumbers = [7,8,9,4,5,6,1,2,3];
    const invertedKeypadNumbers = [1,2,3,4,5,6,7,8,9];
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
    
        function addBorders(borderColor : string, borderVar:string, borderPositions : string[][], elementNumber: number): string {

        let returnString: string = "";
        for (let borderString of borderPositions[elementNumber]) {
            if (borderString !== '') {
                returnString += borderString + ": "+borderVar+" solid var(" + borderColor + "); "
            }
        }
        return returnString;
    };
</script>

<div class="sudoku-grid">
    {#each {length:9}, boxNumber }
        <div class="sudoku-box border-primary" style="{addBorders("--color-primary-light", "var(--box-border-size)", boxBorders, boxNumber)}">
            {#each {length:9}, cellNumber }
                <div class="sudoku-cell bg-background-lightest border-text-grayed" style="{addBorders("--color-text-grayed", "var(--cell-border-size)", cellBorders, cellNumber)}">
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
        --cell-border-size: 0.15rem;
        --box-border-size: 0.3rem;
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
    @media(max-width: 450px) or (max-height:680px) {
        .sudoku-grid {
            --cell-border-size: 0.1rem;
            --box-border-size: 0.2rem;
        }

}
</style>