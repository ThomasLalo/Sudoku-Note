<script lang="ts">
    import type {Snippet } from 'svelte';
    let { color, children }: {color:string; children:Snippet} = $props();
</script>

<!-- style="background-image: linear-gradient(to left, var(--color-background-lightest), var(--color-{color}-lighter));" -->
<div class="isometric-container">
    <div class="face text-primary bg-background-lightest cascadia-code"> {@render children()} </div>
    <div class="right-parallelogram bg-{color}-light-static" style="--right-color: var(--color-{color}-light-static)"></div>
    <div class="bottom-parallelogram bg-{color}-dark-static" style="--bottom-color: var(--color-{color}-dark-static)"></div>
</div>



<style lang="scss">

    .isometric-container {
        position: relative;
        height: 100%;
        width: 100%;
        --diagonal-length: var(--panel-border-width);
    }

    .face {
        position: absolute;
        height: 100%;
        width: 100%;
        top: 0;
        left: 0;
    }

    .right-parallelogram {
        position: absolute;
        width: var(--diagonal-length);
        height: calc(100% - 1px);
        transform: skew(0,45deg);
        transform-origin: left top;
        left: 100%;
        top: 1px;
        box-shadow: inset 0 -1px var(--right-color); // fixes gap between rectangles caused by anti-aliasing
    }

    .bottom-parallelogram {
        position: absolute;
        width: calc(100% - 1px);
        height: var(--diagonal-length);
        transform: skew(45deg);
        transform-origin: left top;
        top: 100%;
        left: 1px;
        box-shadow: inset -1px 0 var(--bottom-color);
    }
        @media(max-width: 450px) {
            .isometric-container {
                --panel-border-width: 0.5rem;
            }}
</style>
