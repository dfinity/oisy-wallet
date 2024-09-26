<script lang="ts">
	type HierarchyOptions =
		| { primary: boolean; secondary?: never }
		| { secondary: boolean; primary?: never };

	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- We need to define the type for the props to mutually exclude hierarchy options; this constructor is defined in https://github.com/dummdidumm/rfcs/blob/ts-typedefs-within-svelte-components/text/ts-typing-props-slots-events.md#typescript-typing-propseventsslots--generics
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
