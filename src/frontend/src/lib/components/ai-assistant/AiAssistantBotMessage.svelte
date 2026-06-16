<script lang="ts">
	import { Markdown } from '@dfinity/gix-components';
	import { fade } from 'svelte/transition';
	import IconRetry from '$lib/components/icons/IconRetry.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		content: string;
		isLastItem: boolean;
		onRetry: () => Promise<void>;
		retryable?: boolean;
	}

	let { content, onRetry, isLastItem, retryable = false }: Props = $props();
</script>

<div class="message mb-5 w-full overflow-hidden text-sm">
	<Markdown text={content} />

	{#if retryable && isLastItem}
		<button
			class="mt-1 flex items-center text-brand-primary hover:text-primary"
			aria-label={$i18n.core.text.retry}
			onclick={onRetry}
			transition:fade
		>
			<IconRetry />

			<span>{$i18n.core.text.retry}</span>
		</button>
	{/if}
</div>

<style lang="scss">
	:global(.message ol, .message ul) {
		list-style: auto;
	}

	:global(.message li) {
		list-style-position: inside;
	}
</style>
