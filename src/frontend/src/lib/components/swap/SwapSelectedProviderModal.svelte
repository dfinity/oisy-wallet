<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext } from 'svelte';
	import SwapProviderListItem from './SwapProviderListItem.svelte';
	import { dAppDescriptions } from '$env/dapp-descriptions.env';
	import { bestSwap } from '$lib/derived/swap.derived';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import { formatTokenBigintToNumber, formatUSD } from '$lib/utils/format.utils';

	const dispatch = createEventDispatcher<{
		icSelectProvider: string;
	}>();

	const { destinationToken, destinationTokenExchangeRate } =
		getContext<SwapContext>(SWAP_CONTEXT_KEY);
	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	const getUsdBalance = (amount: bigint, token: any): string =>
		formatUSD({
			value:
				nonNullish(amount) && nonNullish($destinationTokenExchangeRate)
					? formatTokenBigintToNumber({
							value: amount,
							unitName: token.decimals,
							displayDecimals: token.decimals
						})
					: 0
		});

	const bestProvider = $bestSwap?.provider;

	const handleSelect = (provider: string) => dispatch('icSelectProvider', provider);
</script>

<div class="my-6 flex flex-col overflow-y-hidden sm:max-h-[26rem]">
	<div class="gap-6 overflow-y-auto overscroll-contain">
		<ul class="list-none">
			{#each $swapAmountsStore?.swaps ?? [] as swap (swap.provider)}
				{#if nonNullish(destinationToken)}
					<li class="logo-button-list-item">
						<SwapProviderListItem
							on:click={() => handleSelect(swap.provider)}
							dapp={dAppDescriptions.find(({ id }) => id === swap.provider.toLowerCase())}
							amount={swap.receiveAmount}
							token={destinationToken}
							usdBalance={getUsdBalance(swap.receiveAmount, destinationToken)}
							isBest={swap.provider === bestProvider}
						/>
					</li>
				{/if}
			{/each}
		</ul>
	</div>
</div>
