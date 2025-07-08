<script lang="ts">
    // let { text, toggle }: { text:string, toggle:boolean } = $props();
    let { label, color="accent", onchangeHandler, binder=false}:
        { label:string, color?:string, onchangeHandler:() => void, binder?:boolean } = $props();
    
    function handleChange() {
        onchangeHandler();
    }

    const styleString = `--bottom-color: var(--color-${color}-dark-static);
                        --right-color: var(--color-${color}-light-static); 
                        --highlight-color: var(--color-${color}); 
                        --highlight-color-dark: var(--color-${color}-dark);
                        --box-width: ${label.length+1}vmin; 
                        --box-height: calc(var(--size-font)*1.4);` ;

</script>
<label class="isometric-button bg-background-lightest text-primary cascadia-code" style="{styleString}" >{label}
    <input type="checkbox" checked={binder} onchange="{handleChange}"/>
</label>