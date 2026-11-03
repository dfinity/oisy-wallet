<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		label: Snippet;
		content: Snippet;
		ref?: string;
		element?: 'p' | 'div';
	}

	let { label, content, ref, element = 'p' }: Props = $props();

	// `<label for>` only binds to labelable elements, and the value is a `<p>` or a `<div>`, so the
	// accessibility tree dropped the association and announced the value with no name. The value
	// points back at the label instead, under a role that admits an accessible name at all:
	// `paragraph` and `generic`, the implicit roles here, prohibit one.
	const uid = $props.id();
	const labelId = `value-label-${uid}`;
</script>

<label id={labelId} class="font-bold" for={ref}>{@render label()}</label>

<svelte:element
	this={element}
	id={ref}
	class="mb-4 font-normal break-all"
	aria-labelledby={labelId}
	role="definition"
>
	{@render content?.()}
</svelte:element>
