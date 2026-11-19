<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		icon: Snippet;
		label: string;
		children: Snippet;
	}

	let { icon, label, children }: Props = $props();
</script>

<!-- A labelled control in the user menu, such as the theme or language picker. The label keeps
     the row inset, in line with the menu rows' icons; the control's box reaches the panel's inset,
     in line with the rows' hover fill and the buttons below. -->
<div
	class="flex min-h-(--menu-row-min-height) flex-wrap items-center justify-between gap-x-3 gap-y-2 py-1 ps-(--menu-row-padding-inline)"
>
	<span class="flex min-w-32 items-center gap-3 text-tertiary">
		{@render icon()}
		{label}
	</span>

	{@render children()}
</div>
