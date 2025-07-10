<script lang="ts">
    let { label, color="accent", onchangeHandler, }:
        { label:string, color?:string, onchangeHandler:() => void,  } = $props();
    
    // as far as I know I need this helper function in order to use the passed in function with onchange
    function handleChange() {
        onchangeHandler();
    }

    // why do it this way?
    // isometric button is the selector that provides all the styling to make the button work, but it uses pseudo elements and pseudo classes
    // which can't be styled inline. so instead I set up isometric button to rely upon the custom properties in this template literal. 
    // doing it this way also made it easy to use props in the styling, even with css selectors that are not unique to this component.
    const styleString = `
        --bottom-color: var(--color-${color}-dark-static);
        --right-color: var(--color-${color}-light-static); 
        --highlight-color: var(--color-${color}); 
        --highlight-color-dark: var(--color-${color}-dark);
        --box-width: ${label.length+1}vmin; 
        --box-height: calc(var(--size-font)*1.4);
    `;

</script>

<button class="button-isometric-container" onchange="{handleChange}" style={styleString}>
    <div class="button-face text-text bg-background-lightest cascadia-code">
        {label}
        <div class="button-corner-square"></div> 
        <div class="button-right-parallelogram"></div>
        <div class="button-bottom-parallelogram"></div>
    </div>
</button>