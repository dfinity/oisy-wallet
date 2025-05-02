<script lang="ts">
	import { slide } from 'svelte/transition';
	import { Collapsible, Backdrop } from '@dfinity/gix-components';
	import type { Snippet } from 'svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';

	let { content, contentHeader }: { content: Snippet; contentHeader: Snippet } = $props();

	let expanded = $state(false);

	$effect(() => {
		document.body.classList.toggle('overflow-hidden', expanded);
	});
</script>

<Responsive down="md">
	{#if expanded}
		<div
			class="z-199 rounded-t-4xl fixed bottom-0 left-0 right-0 min-h-[60vh] bg-primary p-4 pt-12"
			transition:slide={{ axis: 'y', duration: 500 }}
		>
			<span
				class="absolute left-[calc(50%-1.5rem)] top-4 h-[0.4rem] w-[3rem] rounded-full bg-disabled-alt"
			></span>
			{@render content()}
		</div>
		<div class="z-198 fixed bottom-0 left-0 right-0 top-0">
			<Backdrop on:nnsClose={() => (expanded = false)} />
		</div>
	{/if}
</Responsive>

<Collapsible bind:expanded initiallyExpanded={expanded}>
	<!-- The width of the item below should be 100% - collapsible expand button width (1.5rem) -->
	<div class="flex w-[calc(100%-2rem)] items-center" slot="header">
		{@render contentHeader()}
	</div>

	<Responsive up="1.5md">
		{@render content()}
	</Responsive>
</Collapsible>
