<script lang="ts">
	import { Backdrop } from '@dfinity/gix-components';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		open: boolean;
	}

	let { children, open = $bindable(false) }: Props = $props();
</script>

{#if open}
	<Backdrop on:nnsClose={() => (open = false)} />

	{@render children()}
{/if}
