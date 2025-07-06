<script lang="ts">
    let { text } = $props();
    const boxWidth = `${text.length* 0.675}rem`; 
</script>

<button class="isometric-button bg-background-lightest text-primary cascadia-code" style="--box-width: {boxWidth}">{text}</button>

<style>

    .isometric-button {
        /* --box-width: 6rem;       */
        --box-height: 1.35rem;     
        --diagonal-length: 0.45rem;
        --translate-distance: 0.175rem;
        position: relative;
        height: var(--box-height);
        width: var(--box-width);
        border: none;
    }

    button:hover {
        background-color: var(--color-background-dark);
    }

    button:active{
        background-color: var(--color-primary-light);
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
        background-color: var(--color-accent-light-static);
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
        background-color: var(--color-accent-dark-static);
    }

    .isometric-button:active::after{
        height: calc( var(--diagonal-length) - var(--translate-distance) );
        transform-origin: left top;
        transform: skew(45deg) translate(0.5px,-0.5px); 
        /* logically I shouldn't have to translate this, but for some reason there's a 1pixel line between this and the face if I don't*/

    }
</style>