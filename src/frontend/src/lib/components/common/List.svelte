<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		element?: 'ul' | 'ol';
		styleClass?: string;
		children?: Snippet;
	}

	const { element = 'ul', styleClass = '', children }: Props = $props();
</script>

{#if element === 'ul'}
	<ul class={styleClass}>{@render children?.()}</ul>
{:else if element === 'ol'}
	<ol class={styleClass}>{@render children?.()}</ol>
{/if}
