<script lang="ts">
	import { getContext, setContext, type Snippet } from 'svelte';
	import { initListStore, LIST_CONTEXT_KEY, type ListContext } from '$lib/stores/list-store.store';
	import type { ListVariant } from '$lib/types/style';

	interface Props {
		variant?: ListVariant;
		element?: 'ul' | 'ol';
		styleClass?: string;
		condensed?: boolean;
		noPadding?: boolean;
		noBorder?: boolean;
		itemStyleClass?: string;
		children?: Snippet;
		testId?: string;
	}

	const {
		variant = 'styled',
		element = 'ul',
		styleClass = '',
		condensed = true,
		noPadding = false,
		noBorder = false,
		itemStyleClass = '',
		children,
		testId
	}: Props = $props();



	setContext<ListContext>(LIST_CONTEXT_KEY, {
		store: initListStore()
	});

	const { store } = getContext<ListContext>(LIST_CONTEXT_KEY);

	$effect(() => {
		store.setList({
			variant,
			condensed,
			noPadding,
			noBorder,
			itemStyleClass
		});
	});
</script>

{#if element === 'ul'}
	<ul class={`list-disc ${styleClass}`} data-tid={testId}>{@render children?.()}</ul>
{:else if element === 'ol'}
	<ol class={styleClass} data-tid={testId}>{@render children?.()}</ol>
{/if}
