<script lang="ts">
    // let { labels, color="accent", onchangeHandler, binder=false}:
    //     { labels:string[], color?:string, onchangeHandler:() => void, binder?:boolean } = $props();
    let { labels, color="accent",  binder=$bindable() }:
        { labels:string[], color?:string, binder:string } = $props();
    
    // function handleChange() {
    //     onchangeHandler();
    // }

    const styleString = `
        --bottom-color: var(--color-${color}-dark-static);
        --right-color: var(--color-${color}-light-static); 
        --highlight-color: var(--color-${color}); 
        --highlight-color-dark: var(--color-${color}-dark);
        --box-height: calc(var(--size-font)*1.4);
    `;

</script>
{#each labels as label}
    <label class="radio-container button-isometric-container" style={styleString+`--box-width: ${label.length * 0.6 + 1.2}rem; `}>
        <div class="button-face text-text bg-background-lightest cascadia-code" >
            {label}
            <input type="radio" bind:group={binder} value={label} /> 
            <!-- onchange="{handleChange}" -->
            <div class="button-corner-square"></div> 
            <div class="button-right-parallelogram"></div>
            <div class="button-bottom-parallelogram"></div>
        </div>
    </label>
{/each}
