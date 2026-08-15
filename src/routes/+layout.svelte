<script lang="ts">
	import '../app.scss';
	let { children } = $props();
</script>

<main>
	<header>
		<h1 class="text-primary cascadia-code">Sudoku Note</h1>
	</header>
	{@render children()}
</main>

<style lang="scss">
	main {
		display: flex;
		flex-direction: column;
		height: 100dvh;
		min-height: 0;
	}

	header {
		flex: 0 0 auto;
	}

	header {
		display: flex;
		align-items: center;
		margin-bottom: var(--button-border-width);
		margin-top: var(--margin-width); //--diagonal-length in IsometricBorder.svelte
		margin-left: var(--margin-width);
	}

	h1 {
		text-shadow: 0.15rem 0.15rem var(--color-secondary-light);
	}

	// Only wide, short screens benefit from reclaiming the header height. Near-square
	// windows are width-limited, so hiding the title there cannot make the grid larger.
	@media (max-height: 600px) and (min-aspect-ratio: 4/3) {
		h1 {
			display: none;
		}
		header {
			position: fixed;
		}
	}
</style>
