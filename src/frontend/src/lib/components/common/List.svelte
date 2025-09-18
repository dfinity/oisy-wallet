<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
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

	export interface ListContext {
		variant: ListVariant;
		condensed?: boolean;
		noPadding?: boolean;
		noBorder?: boolean;
		itemStyleClass?: string;
	}

	setContext<ListContext>('list-context', {
		variant,
		condensed,
		noPadding,
		noBorder,
		itemStyleClass
	});
</script>

{#if element === 'ul'}
	<ul class={`list-disc ${styleClass}`} data-tid={testId}>{@render children?.()}</ul>
{:else if element === 'ol'}
	<ol class={styleClass} data-tid={testId}>{@render children?.()}</ol>
{/if}
