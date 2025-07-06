<script lang="ts">
    import "../app.scss"
    import { onMount } from "svelte";
    import { browser } from '$app/environment';
    let { children } = $props(); //this is needed because slot was deprecated. no idea why props are involved, but I'd guess its all the html that gets combined and passed through the layout

    // function toggleTheme(): void {
    //     if (document.documentElement.dataset.theme === 'dark') {
    //         document.documentElement.dataset.theme = 'light';
    //     } else {
    //         document.documentElement.dataset.theme = 'dark';
    //     }
    // }

    // I need to use local storage and onMount to make the theme check persistent and maybe browser for something

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
            <label for="themeSwitch" class="text-primary cascadia-code">Dark Mode</label>
            <input type="checkbox" bind:checked={toggled} id="themeSwitch" onchange={toggleTheme}>
        </div>
    </header>
    <!-- replaces <slot/> -->
    {@render children()} 
</main>


<style>

    main{
        margin: 1vmin;
    }
    header{
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    h1 {
        text-shadow: .2vmin .2vmin var(--color-secondary-light);
    }
</style>