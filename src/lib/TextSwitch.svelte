<script lang="ts">
	// let { text, toggle }: { text:string, toggle:boolean } = $props();
	let {
		label,
		color = 'accent',
		onchangeHandler,
		binder = false
	}: { label: string; color?: string; onchangeHandler: () => void; binder?: boolean } = $props();

	function handleChange() {
		onchangeHandler();
	}

	const styleString = `
        --bottom-color: var(--color-${color}-dark-static);
        --right-color: var(--color-${color}-light-static); 
        --highlight-color: var(--color-${color}); 
        --highlight-color-dark: var(--color-${color}-dark);
        --box-width: ${label.length * 0.6 + 1.2}rem; 
		--box-height: var(--text-control-height);
    `;
	// --box-width: ${label.length * 0.6 + 1.2}rem;
</script>

<label class="text-switch button-isometric-container" style={styleString}>
	<div class="button-face text-text bg-background-lightest cascadia-code">
		{label}
		<input type="checkbox" checked={binder} onchange={handleChange} />
		<div class="button-corner-square"></div>
		<div class="button-right-parallelogram"></div>
		<div class="button-bottom-parallelogram"></div>
	</div>
</label>

<style lang="scss">
	.text-switch {
		width: min(var(--box-width), calc(100% - var(--button-border-width)));
		height: auto;
		min-height: var(--box-height);
	}

	.text-switch .button-face {
		position: relative;
		height: auto;
		min-height: var(--box-height);
		padding-inline: 0.5rem;
		line-height: 1.25;
		white-space: normal;
		overflow-wrap: anywhere;
	}

	// The shared button edges use the fixed custom-property dimensions needed by
	// keypad buttons. Wrapped switches instead need their edges to follow the
	// face's actual, responsive dimensions.
	.text-switch .button-right-parallelogram {
		height: 100%;
	}

	.text-switch .button-bottom-parallelogram,
	.text-switch .button-face:has(input:checked) .button-bottom-parallelogram,
	.text-switch .button-face:active .button-bottom-parallelogram {
		width: 100%;
	}
</style>
