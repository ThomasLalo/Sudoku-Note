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

	// Transformed edges can land between device pixels at some display scales.
	// Extend their color one pixel over the face so that antialiasing cannot
	// expose the face background as a light seam.
	.right-parallelogram::before,
	.bottom-parallelogram::before {
		content: '';
		position: absolute;
		pointer-events: none;
	}

	.right-parallelogram::before {
		// skewY moves the strip's left edge up by one pixel; counteract that
		// so it ends flush at both corners of the face.
		top: 1px;
		bottom: -1px;
		left: -1px;
		width: 2px;
		background: var(--right-color);
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

	.bottom-parallelogram::before {
		top: -1px;
		// skewX moves the strip's top edge left by one pixel; compensate
		// without shortening it so neither bottom corner develops a gap.
		left: 1px;
		right: -1px;
		height: 2px;
		background: var(--bottom-color);
	}

	.corner-square {
		position: absolute;
		top: 100%;
		left: 100%;
		width: var(--diagonal-length);
		height: var(--diagonal-length);
		pointer-events: none;
	}
</style>
