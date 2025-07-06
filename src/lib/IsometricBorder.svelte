<script lang="ts">
    import type {Snippet } from 'svelte';
    let { color, children }: {color:string; children:Snippet} = $props();
</script>


<div class="isometric-container">
    <div class="face bg-background-lightest text-primary cascadia-code"> {@render children()} </div>
    <div class="right-parallelogram bg-{color}-light-static"></div>
    <div class="bottom-parallelogram bg-{color}-dark-static"></div>
</div>



<style>

    .isometric-container {
        position: relative;
        height: 100%;
        width: 100%;
        --diagonal-length: 0.75rem;
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
        height: 100%;
        transform: skew(0,45deg);
        transform-origin: left top;
        left: 100%;
    }

    .bottom-parallelogram {
        position: absolute;
        width: 100%;
        height: var(--diagonal-length);
        transform: skew(45deg);
        transform-origin: left top;
        top: 100%;
    }
</style>