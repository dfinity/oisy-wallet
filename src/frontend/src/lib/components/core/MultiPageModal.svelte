<!--
A component that handles a stack of modal page components with support for custom title and toolbar snippets.
Only the topmost modal is visible at any time, and when closed, the previous modal becomes visible.

Snippets:
Page components can export optional snippets that will be rendered in specific areas:
- titleSnippet: Rendered in the modal's title area
- toolbarSnippet: Rendered in the modal's toolbar area

-->

<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import type { Snippet } from 'svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import {
		multiPageModalStore,
		type PageExports,
		type PageDefinition,
		type PageProps
	} from '$lib/stores/multi-page-modal.store';

	let pageInstances = $state<PageExports[]>([]);

	let currentIndex = $derived($multiPageModalStore.length - 1);
	let currentInstance = $derived(pageInstances[currentIndex]);
</script>

{#snippet renderSnippetIfAvailable(snippet?: Snippet)}
	{#if snippet}
		{@render snippet()}
	{/if}
{/snippet}

{#snippet pageSnippet(index: number, page: PageDefinition<PageProps, PageExports>)}
	<ContentWithToolbar styleClass="mx-2 overflow-scroll">
		<page.component {...page.props} bind:this={pageInstances[index]}></page.component>

		<svelte:fragment slot="toolbar">
			{@render renderSnippetIfAvailable(pageInstances[index]?.toolbarSnippet)}
		</svelte:fragment>
	</ContentWithToolbar>
{/snippet}

{#if currentIndex >= 0}
	<Modal on:nnsClose={() => close()}>
		<svelte:fragment slot="title">
			{#if currentInstance?.titleSnippet}
				<span class="text-xl">
					{@render renderSnippetIfAvailabl(currentInstance.titleSnippet)}
				</span>
			{/if}
		</svelte:fragment>

		<div class="stretch m-0 p-0">
			{#each $multiPageModalStore as page, pageIndex (pageIndex)}
				{pageIndex} === {currentIndex}
				<div style={`display: ${pageIndex === currentIndex ? 'block' : 'none'};`}>
					{@render pageSnippet(pageIndex, page)}
				</div>
			{/each}
		</div>
	</Modal>
{/if}
