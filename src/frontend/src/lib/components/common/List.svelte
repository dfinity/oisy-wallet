<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import type { ListVariant } from '$lib/types/style';

	interface Props {
		variant?: ListVariant;
		element?: 'ul' | 'ol';
		styleClass?: string;
		condensed?: boolean;
		children?: Snippet;
	}

	const {
		variant = 'styled',
		element = 'ul',
		styleClass = '',
		condensed = true,
		children
	}: Props = $props();

	export interface ListContext {
		variant: ListVariant;
		condensed?: boolean;
	}

	setContext<ListContext>('list-context', { variant, condensed });
</script>

{#if element === 'ul'}
	<ul class={`list-disc ${styleClass}`}>{@render children?.()}</ul>
{:else if element === 'ol'}
	<ol class={styleClass}>{@render children?.()}</ol>
{/if}
