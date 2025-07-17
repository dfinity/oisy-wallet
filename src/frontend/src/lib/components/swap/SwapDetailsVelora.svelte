<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { SwapMappedResult, SwapProvider } from '$lib/types/swap';
	import { formatReceiveOutMinimum } from '$lib/utils/swap.utils';

	interface Props {
		provider: Extract<SwapMappedResult, { provider: SwapProvider.VELORA }>;
		slippageValue: OptionAmount;
	}

	const { provider, slippageValue }: Props = $props();
	const { destinationToken } = getContext<SwapContext>(SWAP_CONTEXT_KEY);

	console.log({ provider });
</script>

<ModalValue>
	{#snippet label()}
		Type
	{/snippet}

	{#snippet mainValue()}
		{provider.type}
	{/snippet}
</ModalValue>

{#if provider.type === 'delta'}
	<ModalValue>
		{#snippet label()}
			{'Network Cost'}
		{/snippet}

		{#snippet mainValue()}
			{'Gasless'}
		{/snippet}
	</ModalValue>

	<ModalValue>
		{#snippet label()}
			{'Swap Fees'}
		{/snippet}

		{#snippet mainValue()}
			$0
		{/snippet}
	</ModalValue>
{/if}
