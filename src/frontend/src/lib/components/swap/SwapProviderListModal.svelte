<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext } from 'svelte';
	import SwapProviderListItem from './SwapProviderListItem.svelte';
	import { dAppDescriptions } from '$env/dapp-descriptions.env';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import { formatTokenBigintToNumber, formatUSD } from '$lib/utils/format.utils';
	import ButtonGroup from '../ui/ButtonGroup.svelte';
	import ButtonCancel from '../ui/ButtonCancel.svelte';
	import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';

	const dispatch = createEventDispatcher<{
		icSelectProvider: string;
		icCloseProviderList: void;
	}>();

	const { destinationToken, destinationTokenExchangeRate } =
		getContext<SwapContext>(SWAP_CONTEXT_KEY);
	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	const getUsdBalance = (amount: bigint, token: IcTokenToggleable | undefined): string =>
		formatUSD({
			value:
				nonNullish(amount) && nonNullish(token) && nonNullish($destinationTokenExchangeRate)
					? formatTokenBigintToNumber({
							value: amount,
							unitName: token.decimals,
							displayDecimals: token.decimals
						}) * $destinationTokenExchangeRate
					: 0
		});
</script>

<div class=" mb-4 overflow-y-auto overscroll-contain">
	<div class="flex w-full flex-row justify-between border-b border-solid border-primary pb-2">
		<div class="text-sm text-tertiary"> Swap Provider </div>
		<div class="text-sm text-tertiary"> You receive </div>
	</div>
	<ul class="list-none">
		{#each $swapAmountsStore?.swaps ?? [] as swap (swap.provider)}
			{#if nonNullish($destinationToken) && nonNullish($swapAmountsStore)}
				<li class="logo-button-list-item">
					<SwapProviderListItem
						on:click={() => dispatch('icSelectProvider', swap.provider)}
						dapp={dAppDescriptions.find(({ id }) => id === swap.provider.toLowerCase())}
						amount={swap.receiveAmount}
						token={$destinationToken}
						usdBalance={getUsdBalance(swap.receiveAmount, $destinationToken)}
						isBest={true}
					/>
				</li>
			{/if}
		{/each}
	</ul>
</div>

<ButtonGroup>
	<ButtonCancel fullWidth={true} onclick={() => dispatch('icCloseProviderList')} />
</ButtonGroup>
