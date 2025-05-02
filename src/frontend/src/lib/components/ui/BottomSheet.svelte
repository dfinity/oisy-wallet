<script lang="ts">
	import { Collapsible, Backdrop } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { slide } from 'svelte/transition';
	import Responsive from '$lib/components/ui/Responsive.svelte';

	let {
		content,
		contentHeader,
		bottomSheetFooter
	}: {
		content: Snippet;
		contentHeader: Snippet;
		bottomSheetFooter?: Snippet<[closeFn: () => void]>;
	} = $props();

	let expanded = $state(false);

	$effect(() => {
		document.body.classList.toggle('overflow-hidden', expanded);
	});
</script>

<Responsive down="md">
	{#if expanded}
		<div
			class="z-6 rounded-t-4xl fixed bottom-0 left-0 right-0 flex min-h-[40vh] flex-col justify-between bg-primary pt-4"
			transition:slide={{ axis: 'y', duration: 500 }}
		>
			<div class="flex p-4">
				{@render content()}
			</div>
			{#if nonNullish(bottomSheetFooter)}
				<div class="flex border-t border-disabled p-4">
					{@render bottomSheetFooter(() => {
						expanded = false;
					})}
				</div>
			{/if}
		</div>
		<div class="z-5 fixed bottom-0 left-0 right-0 top-0">
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
