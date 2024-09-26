<script lang="ts">
	type HierarchyOptions =
		| { primary: true; secondary?: never }
		| { secondary: true; primary?: never };

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	// noinspection JSUnusedGlobalSymbols
	type $$Props = HierarchyOptions & {
		type?: 'submit' | 'reset' | 'button';
		disabled?: boolean;
	};

	export let type: 'submit' | 'reset' | 'button' = 'submit';
	export let disabled = false;

	// We guarantee that, if either primary or secondary is set, they mutually exclude each other
	$: {
		if ('primary' in $$props) {
			$$props.secondary = !$$props.primary;
		} else if ('secondary' in $$props) {
			$$props.primary = !$$props.secondary;
		} else {
			$$props.primary = false;
			$$props.secondary = false;
		}
	}
</script>

<button
	class="block flex-1"
	{type}
	{disabled}
	on:click
	class:primary={$$props.primary}
	class:secondary={$$props.secondary}
>
	<slot />
</button>
