<script lang="ts">
    import "../app.scss"
    import { onMount } from "svelte";
    import { browser } from '$app/environment';
	import TextSwitch from "$lib/TextSwitch.svelte";
    let { children } = $props(); //this is needed because slot was deprecated. no idea why props are involved, but I'd guess its all the html that gets combined and passed through the layout

    // function toggleTheme(): void {
    //     if (document.documentElement.dataset.theme === 'dark') {
    //         document.documentElement.dataset.theme = 'light';
    //     } else {
    //         document.documentElement.dataset.theme = 'dark';
    //     }
    // }


    // should I really use $state and $effect? they don't add anything here
    let theme = $state("light");
    let toggled = $state(false);

    // onMount runs when the component (the page in this case) is loaded
    onMount(() => { 
        const savedTheme = localStorage.getItem("theme");
        if (savedTheme !== null) {
            theme = savedTheme;
        }
        if (theme === "light") {
            toggled = false;
        } else {
            toggled = true;
        }
    });

    function toggleTheme(): void {
        if (theme === "light") {
            theme = "dark"
        } else {
            theme = "light"
        }
    }

    $effect(() => {
        if (browser) {
            document.documentElement.dataset.theme = theme
            localStorage.setItem("theme",theme);
        }
    });
</script>

<main>
    <header>
        <h1 class="text-primary cascadia-code">Sudoku Note</h1>
        <div class="button-container">
            <TextSwitch label="Dark Mode" onchangeHandler={toggleTheme} binder={toggled}/>
            <!-- <label for="themeSwitch" class="text-primary cascadia-code">Dark Mode</label>
            <input type="checkbox" bind:checked={toggled} id="themeSwitch" onchange={toggleTheme}> -->
        </div>
    </header>
    <!-- replaces <slot/> -->
    {@render children()} 
</main>


<style lang="scss">
    header{
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--button-border-width);
        margin-top: var(--margin-width); //--diagonal-length in IsometricBorder.svelte 
        margin-left: var(--margin-width);
    }

    h1 {
        text-shadow: 0.15rem 0.15rem var(--color-secondary-light);
    }
    
    .button-container {
        margin-right: var(--margin-plus-panel); // --diagonal-length in TextButton.svelte
    }
    @media(max-height:600px) {
        h1 {
            display: none;
        }
        header{ 
            position: fixed;
            right: var(--margin-width);
        }
    }
</style>