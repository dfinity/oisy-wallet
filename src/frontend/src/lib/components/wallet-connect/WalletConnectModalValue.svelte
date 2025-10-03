<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		label: string;
		ref: string;
		children: Snippet;
	}

	let { label, ref, children }: Props = $props();
</script>

<label class="font-bold" for={ref}>{label}</label>

<div id={ref} class="mb-4 flex items-center gap-1 font-normal">
	{@render children()}
</div>
