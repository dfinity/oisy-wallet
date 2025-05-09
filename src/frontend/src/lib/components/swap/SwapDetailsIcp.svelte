<script lang="ts">
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import type { SwapMappedResult, SwapProvider } from '$lib/types/swap';
	import { nonNullish } from '@dfinity/utils';

	export let provider: Extract<SwapMappedResult, { provider: SwapProvider.ICP_SWAP }>;
</script>

{#if nonNullish(provider.receiveOutMinimum)}
	<span>{provider.receiveOutMinimum}</span>
{/if}
