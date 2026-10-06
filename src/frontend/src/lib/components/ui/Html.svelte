<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import { sanitize, sanitizeUntrusted } from '$lib/utils/html.utils';

	interface Props {
		text?: string;
		untrusted?: boolean;
	}

	let { text, untrusted = false }: Props = $props();

	// force to rerender after SSR
	let mounted = $state(false);
	onMount(() => (mounted = true));
</script>

{#if mounted && nonNullish(text)}
	<!-- eslint-disable svelte/no-at-html-tags -->
	{@html untrusted ? sanitizeUntrusted(text) : sanitize(text)}
{/if}
