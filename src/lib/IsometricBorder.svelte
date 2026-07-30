<script lang="ts">
	import type { Snippet } from 'svelte';
	let {
		color,
		fitContent = false,
		fitHeight = false,
		children
	}: { color: string; fitContent?: boolean; fitHeight?: boolean; children: Snippet } = $props();
</script>

<!-- style="background-image: linear-gradient(to left, var(--color-background-lightest), var(--color-{color}-lighter));" -->
<div class:fit-content={fitContent} class:fit-height={fitHeight} class="isometric-container">
	<div class="face text-primary bg-background-lightest cascadia-code">{@render children()}</div>
	<!-- Covers the antialiased seam where the two isometric faces meet. -->
	<div class="corner-square bg-{color}-light-static"></div>
	<div
		class="right-parallelogram bg-{color}-light-static"
		style="--right-color: var(--color-{color}-light-static)"
	></div>
	<div
		class="bottom-parallelogram bg-{color}-dark-static"
		style="--bottom-color: var(--color-{color}-dark-static)"
	></div>
</div>

<style lang="scss">
	.isometric-container {
		position: relative;
		height: 100%;
		width: 100%;
		--diagonal-length: var(--panel-border-width);
	}

	.isometric-container.fit-content {
		height: fit-content;
		width: fit-content;
	}

	.isometric-container.fit-height {
		height: fit-content;
	}

	.face {
		position: absolute;
		height: 100%;
		width: 100%;
		top: 0;
		left: 0;
	}

	.fit-content .face,
	.fit-height .face {
		position: relative;
		height: auto;
	}

	.fit-content .face {
		width: auto;
	}

	.right-parallelogram {
		position: absolute;
		width: var(--diagonal-length);
		height: 100%;
		transform: skew(0, 45deg);
		transform-origin: left top;
		left: 100%;
		top: 0;
		box-shadow: inset 0 -1px var(--right-color); // fixes gap between rectangles caused by anti-aliasing
	}

	.bottom-parallelogram {
		position: absolute;
		width: 100%;
		height: var(--diagonal-length);
		transform: skew(45deg);
		transform-origin: left top;
		top: 100%;
		left: 0;
		box-shadow: inset -1px 0 var(--bottom-color);
	}

	.corner-square {
		position: absolute;
		top: 100%;
		left: 100%;
		width: var(--diagonal-length);
		height: var(--diagonal-length);
		pointer-events: none;
	}

	@media (max-width: 450px) {
		.isometric-container {
			--panel-border-width: 0.5rem;
		}
	}
</style>
