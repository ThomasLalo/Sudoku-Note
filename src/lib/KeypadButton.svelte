<script lang="ts">
    // let { text, toggle }: { text:string, toggle:boolean } = $props();
    let { text, color, toggle, onchangeHandler, binder=false}: { text:string, color:string, toggle:boolean, onchangeHandler:() => void, binder?:boolean } = $props();
    // const boxWidth = `${text.length* 0.675}rem`; 
    // console.log(text+" button "+boxWidth)
    function handleChange() {
        onchangeHandler();
    }
    // const styleString = "--bottom-color: var(--color-"+color+"-dark-static); --right-color: var(--color-"+color+"-light-static); --highlight-color: var(--color-"+color+"); --highlight-color-dark: var(--color-"+color+"-dark);";
    const styleString = `--bottom-color: var(--color-${color}-dark-static);
                        --right-color: var(--color-${color}-light-static); 
                        --highlight-color: var(--color-${color}); 
                        --highlight-color-dark: var(--color-${color}-dark);`;
</script>

{#if toggle}
    <label class="isometric-button bg-background-light text-primary cascadia-code" style={styleString} >{text}
        <input type="checkbox" checked={binder} onchange="{handleChange}"/>
    </label>
{:else}
    <button class="isometric-button bg-background-light text-primary cascadia-code" onchange="{handleChange}" style={styleString}>{text}</button>
{/if}

<style lang="scss">
    .isometric-button {
        display: inline-block; // labels being inline by default adds weird width and height stuff, this had to be changed for the label to be a box
        flex-shrink: 0; //stop flexbox in parent from altering height or width
        --diagonal-length: var(--button-border-width);
        --translate-distance: calc(var(--button-border-width) / 3);
        font-size: calc(var(--size-font) * 2);
        --box-height: calc(var(--size-font) * 2 + 1vmin);
        --box-width: calc(var(--size-font) * 2 + 1vmin);
        text-align: center;
        // vertical-align: middle;
        position: relative;
        height: var(--box-height);
        width: var(--box-width);
        border: none;
    }

    .isometric-button:hover {
        background-color: var(--highlight-color);
    }

    .isometric-button:active{
        background-color: var(--highlight-color-dark);
        transform: translate(var(--translate-distance), var(--translate-distance)); 
    }

    /* right parallelogram - vertical*/
    .isometric-button::before {
        content: "";
        /* ::before and ::after won't show up without this */
        pointer-events: none;
        /* this stops the isometric border from being clickable */
        position: absolute;
        width: var(--diagonal-length);
        height: var(--box-height);
        transform: skew(0,45deg);
        /* without the 0 it just skews the x axis, adding in the 0 lets me skew the y-axis */
        transform-origin: left top;
        left: 100%;
        top: 0%; /* override standard ::before positioning behavior */
        background-color: var(--right-color);
    }

    .isometric-button:active::before{
        width: calc( var(--diagonal-length) - var(--translate-distance) );
        transform-origin: left top;
        transform:  skew(0,45deg);
    }

    /* bottom parallelogram - horizontal */
    .isometric-button::after{
        content: "";
        pointer-events: none;
        position: absolute;
        width: var(--box-width);
        height: var(--diagonal-length);
        transform: skew(45deg);
        transform-origin: left top;
        top: 100%;
        left: 0%; /* override standard ::after positioning behavior */
        background-color: var(--bottom-color);
    }

    .isometric-button:active::after{
        height: calc( var(--diagonal-length) - var(--translate-distance) );
        transform-origin: left top;
        transform: skew(45deg) translate(0.5px,-0.5px); 
        /* logically I shouldn't have to translate this, but for some reason there's a 1pixel line between this and the face if I don't*/
    }

    /* checkbox styles */
    /* hiding the checkbox itself, and resetting it's default values */
    .isometric-button input[type="checkbox"] {
        display: none;
        /* position: absolute; 
        opacity: 0;
        height: 0;
        width: 0;
        margin: 0;
        padding: 0; */
    }

    .isometric-button:has(input:checked) {
        background-color: var(--color-background-lightest);
        transform: translate(var(--translate-distance), var(--translate-distance)); 
    }

    
    .isometric-button:has(input:checked):hover {
        background-color: var(--highlight-color);
    }

    .isometric-button:has(input:checked)::before {
        width: calc( var(--diagonal-length) - var(--translate-distance) );
        transform-origin: left top;
        transform:  skew(0,45deg);
    }

    .isometric-button:has(input:checked)::after{
        height: calc( var(--diagonal-length) - var(--translate-distance) );
        transform-origin: left top;
        transform: skew(45deg) translate(0.5px,-0.5px); 
        /* logically I shouldn't have to translate this, but for some reason there's a 1pixel line between this and the face if I don't*/
    }

</style>