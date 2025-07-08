<script lang="ts">

    let { text, color, onchangeHandler, toggle=false, binder=false}: { text:string, color:string, onchangeHandler:() => void, toggle?:boolean, binder?:boolean } = $props();

    function handleChange() {
        onchangeHandler();
    }
    
    const styleString = 
        `--bottom-color: var(--color-${color}-dark-static);
        --right-color: var(--color-${color}-light-static); 
        --highlight-color: var(--color-accent-light); 
        --highlight-color-dark: var(--color-accent);
        --size-font: 64px; 
        --box-height: calc(var(--size-font) + 1vmin);
        --box-width: calc(var(--size-font) + 1vmin);`
    ;

</script>

{#if toggle}
    <label class="isometric-button bg-background-light text-primary-dark cascadia-code" style={styleString} >{text}
        <input type="checkbox" checked={binder} onchange="{handleChange}"/>
    </label>
{:else}
    <button class="isometric-button bg-background-light text-primary-dark cascadia-code" onchange="{handleChange}" style={styleString}>{text}</button>
{/if}

