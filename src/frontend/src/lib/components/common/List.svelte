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
		// TODO: This statement is not reactive. Check if it is intentional or not.
		// eslint-disable-next-line svelte/no-unused-svelte-ignore
		// svelte-ignore state_referenced_locally
		variant,
		// TODO: This statement is not reactive. Check if it is intentional or not.
		// eslint-disable-next-line svelte/no-unused-svelte-ignore
		// svelte-ignore state_referenced_locally
		condensed,
		// TODO: This statement is not reactive. Check if it is intentional or not.
		// eslint-disable-next-line svelte/no-unused-svelte-ignore
		// svelte-ignore state_referenced_locally
		noPadding,
		// TODO: This statement is not reactive. Check if it is intentional or not.
		// eslint-disable-next-line svelte/no-unused-svelte-ignore
		// svelte-ignore state_referenced_locally
		noBorder,
		// TODO: This statement is not reactive. Check if it is intentional or not.
		// eslint-disable-next-line svelte/no-unused-svelte-ignore
		// svelte-ignore state_referenced_locally
		itemStyleClass
	});
</script>

{#if element === 'ul'}
	<ul class={`list-disc ${styleClass}`} data-tid={testId}>{@render children?.()}</ul>
{:else if element === 'ol'}
	<ol class={styleClass} data-tid={testId}>{@render children?.()}</ol>
{/if}
