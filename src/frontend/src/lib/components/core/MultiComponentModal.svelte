<!--
A component that handles a stack of modal components with support for custom title and toolbar snippets.
Only the topmost modal is visible at any time, and when closed, the previous modal becomes visible.

The component provides two exported functions:
- open(): Opens a new modal on top of the stack
- close(): Closes the topmost modal

Snippets:
Modal components can export optional snippets that will be rendered in specific areas:
- titleSnippet: Rendered in the modal's title area
- toolbarSnippet: Rendered in the modal's toolbar area

-->

<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import type { Component, ComponentProps, Snippet } from 'svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	interface ModalExports extends Record<string, any> {
		titleSnippet?: Snippet;
		toolbarSnippet?: Snippet;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	interface ModalProps extends Record<string, any> {}

	type ModalComponent = Component<ModalProps, ModalExports>;

	interface ModalDefinition {
		component: ModalComponent;
		props: ModalProps;
	}

	let modals = $state<ModalDefinition[]>([]);
	let modalInstances = $state<ModalExports[]>([]);

	let currentIndex = $derived(modals.length - 1);
	let currentModal = $derived(modals[currentIndex]);
	let currentInstance = $derived(modalInstances[currentIndex]);

	export function open({
		component,
		props = {}
	}: {
		component: ModalComponent;
		props: ComponentProps<ModalComponent>;
	}) {
		modals.push({
			component,
			props
		});
	}

	export function close() {
		modals.pop();
	}
</script>

{#snippet renderSnippetIfAvailable(snippet?: Snippet)}
	{#if snippet}
		{@render snippet()}
	{/if}
{/snippet}

{#snippet modalSnippet(index: number, modal: ModalDefinition)}
	<ContentWithToolbar styleClass="mx-2 overflow-scroll">
		<modal.component {...currentModal.props} bind:this={modalInstances[index]}></modal.component>

		<svelte:fragment slot="toolbar">
			{@render renderSnippetIfAvailable(modalInstances[index]?.toolbarSnippet)}
		</svelte:fragment>
	</ContentWithToolbar>
{/snippet}

{#if currentIndex >= 0}
	<Modal on:nnsClose={() => close()}>
		<svelte:fragment slot="title">
			{#if currentInstance?.titleSnippet}
				<span class="text-xl">
					{@render renderSnippetIfAvailable(currentInstance.titleSnippet)}
				</span>
			{/if}
		</svelte:fragment>

		<div class="stretch m-0 p-0">
			{#each modals as modal, modalIndex (modalIndex)}
				<div style={`display: ${modalIndex === currentIndex ? 'block' : 'none'};`}>
					{@render modalSnippet(modalIndex, modal)}
				</div>
			{/each}
		</div>
	</Modal>
{/if}
