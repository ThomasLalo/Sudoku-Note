<script lang="ts">

    let { label, color, onchangeHandler, toggle=false, binder=false}:
    { label:string, color:string, onchangeHandler:() => void, toggle?:boolean, binder?:boolean } = $props();

    function handleChange() {
        onchangeHandler();
    }
    
    const styleString = `
        --bottom-color: var(--color-${color}-dark-static);
        --right-color: var(--color-${color}-light-static); 
        --highlight-color: var(--color-accent); 
        --highlight-color-dark: var(--color-accent-dark);
        --box-height: calc(var(--size-font) + 1vmin);
        --box-width: calc(var(--size-font) + 1vmin);
    `;

</script>

{#if toggle}
    <label class="button-isometric-container style={styleString}">
        <div class="button-face text-text bg-background cascadia-code"> 
            {label} 
            <input type="checkbox" checked={binder} onchange="{onchangeHandler}"/>
            <div class="button-right-parallelogram"></div>
            <div class="button-bottom-parallelogram"></div>
        </div>
    </label>

{:else}
    <button class="button-isometric-container" onclick="{handleChange}" style={styleString}>
        <div class="button-face text-text bg-background cascadia-code"> 
            {label} 
            <!-- corner square must come first to be underneath -->
            <div class="button-corner-square"></div> 
            <div class="button-right-parallelogram"></div>
            <div class="button-bottom-parallelogram"></div>
        </div>
    </button>

{/if}

<style lang="scss">
    .button-isometric-container {
        --size-font: 4rem; 
    }
    // @media (max-aspect-ratio: 1/1) {
    //     .button-isometric-container{
    //         --size-font: 2rem;
    //     }
    // }
        @media (max-width: 1214px) { // phone portrait
        .button-isometric-container{
            --size-font: 2rem;
        }
    }
    @media(max-width: 900px) {
        .button-isometric-container{
            --size-font: 4rem;
        }
    }
    @media(max-height:680px) {
        .button-isometric-container{
            --size-font: 2rem;
        }
    }

</style>

