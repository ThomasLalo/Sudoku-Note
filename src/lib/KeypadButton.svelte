<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		label,
		color,
		onchangeHandler = () => {},
		toggle = false,
		checkbox = false,
		disabled = false,
		binder = $bindable(''),
		activeBinder,
		checked = $bindable(false),
		children
	}: {
		label: string;
		color: string;
		onchangeHandler?: (event: MouseEvent) => void;
		toggle?: boolean;
		checkbox?: boolean;
		disabled?: boolean;
		binder?: string;
		activeBinder?: string;
		checked?: boolean;
		children?: Snippet;
	} = $props();

	function handleChange(event: MouseEvent) {
		onchangeHandler(event);
	}

	function handleModeChange() {
		binder = label;
	}

	let effectiveBinder = $derived(activeBinder ?? binder);
	let styleString = $derived(`
		--face-color: var(--color-${color});
        --bottom-color: var(--color-${color}-dark-static);
        --right-color: var(--color-${color}-light-static);
        --highlight-color: var(--color-${color}-light);
        --highlight-color-dark: var(--color-${color}-dark);
        --box-height: calc(var(--size-font) + 1vmin);
        --box-width: calc(var(--size-font) + 1vmin);
    `);
</script>

{#if checkbox}
	<label
		class="button-isometric-container"
		class:button-disabled={disabled}
		style={styleString}
		data-preserve-grid-selection
		title={label}
	>
		<div class="button-face text-background-lightest bg-{color} cascadia-code">
			<span class="button-content" aria-hidden="true">
				{#if children}
					{@render children()}
				{:else}
					{label}
				{/if}
			</span>
			<input type="checkbox" aria-label={label} {disabled} bind:checked />
			<div class="button-corner-square"></div>
			<div class="button-right-parallelogram"></div>
			<div class="button-bottom-parallelogram"></div>
		</div>
	</label>
{:else if toggle}
	<label
		class="button-isometric-container"
		class:button-disabled={disabled}
		style={styleString}
		data-preserve-grid-selection
		title={label}
	>
		<div class="button-face text-background-lightest bg-{color} cascadia-code">
			<span class="button-content" aria-hidden="true">
				{#if children}
					{@render children()}
				{:else}
					{label}
				{/if}
			</span>
			<input
				type="radio"
				name="keypad-mode"
				value={label}
				aria-label={label}
				{disabled}
				checked={effectiveBinder === label}
				onchange={handleModeChange}
			/>
			<div class="button-corner-square"></div>
			<div class="button-right-parallelogram"></div>
			<div class="button-bottom-parallelogram"></div>
		</div>
	</label>
{:else}
	<button
		class="button-isometric-container"
		data-preserve-grid-selection
		onclick={handleChange}
		style={styleString}
		title={label}
		aria-label={label}
		{disabled}
	>
		<div class="button-face text-background-lightest bg-{color} cascadia-code">
			<span class="button-content" aria-hidden={children ? 'true' : undefined}>
				{#if children}
					{@render children()}
				{:else}
					{label}
				{/if}
			</span>
			<!-- corner square must come first to be underneath -->
			<div class="button-corner-square"></div>
			<div class="button-right-parallelogram"></div>
			<div class="button-bottom-parallelogram"></div>
		</div>
	</button>
{/if}

<style lang="scss">
	.button-isometric-container:disabled,
	.button-disabled {
		opacity: 0.45;
	}

	.button-isometric-container:disabled .button-face,
	.button-isometric-container:disabled .button-face:hover,
	.button-isometric-container:disabled .button-face:active,
	.button-disabled .button-face,
	.button-disabled .button-face:hover,
	.button-disabled .button-face:active {
		background-color: var(--face-color);
		box-shadow: none;
		cursor: not-allowed;
		transform: none;
	}

	.button-content {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}

	.button-content :global(svg) {
		width: 65%;
		height: 65%;
	}
</style>
