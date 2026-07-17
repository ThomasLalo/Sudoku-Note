<script lang="ts">
	import '../app.scss';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import TextSwitch from '$lib/TextSwitch.svelte';
	let { children } = $props();
	let theme = $state('light');
	let toggled = $state(false);

	onMount(() => {
		const savedTheme = localStorage.getItem('theme');
		if (savedTheme !== null) {
			theme = savedTheme;
		}
		if (theme === 'light') {
			toggled = false;
		} else {
			toggled = true;
		}
	});

	function toggleTheme(): void {
		if (theme === 'light') {
			theme = 'dark';
		} else {
			theme = 'light';
		}
	}

	$effect(() => {
		if (browser) {
			document.documentElement.dataset.theme = theme;
			localStorage.setItem('theme', theme);
		}
	});
</script>

<main>
	<header>
		<h1 class="text-primary cascadia-code">Sudoku Note</h1>
		<div class="button-container">
			<TextSwitch label="Dark Mode" onchangeHandler={toggleTheme} binder={toggled} />
		</div>
	</header>
	{@render children()}
</main>

<style lang="scss">
	@media (min-width: 1616px) {
		main {
			--desktop-grid-spacing: calc(2.4rem + var(--margin-width) + var(--button-border-width));

			display: flex;
			flex-direction: column;
			height: 100dvh;
			padding-bottom: var(--desktop-grid-spacing);
			overflow: hidden;
		}

		header {
			flex: 0 0 auto;
			height: 2.4rem;
		}
	}

	header {
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
		margin-right: var(--margin-plus-panel);
	}
	@media (max-height: 600px) {
		h1 {
			display: none;
		}
		header {
			position: fixed;
			right: var(--margin-width);
		}
	}
</style>
