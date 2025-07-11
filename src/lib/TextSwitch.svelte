<script lang="ts">
    // let { text, toggle }: { text:string, toggle:boolean } = $props();
    let { label, color="accent", onchangeHandler, binder=false}:
        { label:string, color?:string, onchangeHandler:() => void, binder?:boolean } = $props();
    
    function handleChange() {
        onchangeHandler();
    }

    const styleString = `
        --bottom-color: var(--color-${color}-dark-static);
        --right-color: var(--color-${color}-light-static); 
        --highlight-color: var(--color-${color}); 
        --highlight-color-dark: var(--color-${color}-dark);
        --box-width: ${label.length * 0.6 + 1.2}rem; 
        --box-height: calc(var(--size-font)*1.4);
    `;

</script>

<label class="button-isometric-container" style={styleString}>
    <div class="button-face text-text bg-background-lightest cascadia-code" >
        {label}
        <input type="checkbox" checked={binder} onchange="{handleChange}"/>
        <div class="button-corner-square"></div> 
        <div class="button-right-parallelogram"></div>
        <div class="button-bottom-parallelogram"></div>
    </div>
</label>