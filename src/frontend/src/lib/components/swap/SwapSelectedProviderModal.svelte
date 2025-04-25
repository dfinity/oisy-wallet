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
	import ButtonGroup from '../ui/ButtonGroup.svelte';
	import ButtonCancel from '../ui/ButtonCancel.svelte';

	const dispatch = createEventDispatcher<{
		icSelectProvider: string;
		icCloseProviderList: void;
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
						}) * $destinationTokenExchangeRate
					: 0
		});

	const bestProvider = $bestSwap?.provider;

	const handleSelect = (provider: string) => dispatch('icSelectProvider', provider);
</script>

<div class=" mb-4 overflow-y-auto overscroll-contain">
	<div class="flex w-full flex-row justify-between border-b border-solid border-primary pb-2">
		<div class="text-sm text-tertiary"> Swap Provider </div>
		<div class="text-sm text-tertiary"> You receive </div>
	</div>
	<ul class="list-none">
		{#each $swapAmountsStore?.swaps ?? [] as swap (swap.provider)}
			{#if nonNullish($destinationToken)}
				<li class="logo-button-list-item">
					<SwapProviderListItem
						on:click={() => handleSelect(swap.provider)}
						dapp={dAppDescriptions.find(({ id }) => id === swap.provider.toLowerCase())}
						amount={swap.receiveAmount}
						token={$destinationToken}
						usdBalance={getUsdBalance(swap.receiveAmount, $destinationToken)}
						isBest={swap.provider === bestProvider}
					/>
				</li>
			{/if}
		{/each}
	</ul>
</div>

<ButtonGroup>
	<ButtonCancel fullWidth={true} on:click={() => dispatch('icCloseProviderList')} />
</ButtonGroup>
