<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext } from 'svelte';
	import SwapProviderListItem from './SwapProviderListItem.svelte';
	import { dAppDescriptions } from '$env/dapp-descriptions.env';
	import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { SwapMappedResult } from '$lib/types/swap';
	import { formatTokenBigintToNumber, formatCurrency } from '$lib/utils/format.utils';

	const dispatch = createEventDispatcher<{
		icSelectProvider: SwapMappedResult;
		icCloseProviderList: void;
	}>();

	const { destinationToken, destinationTokenExchangeRate } =
		getContext<SwapContext>(SWAP_CONTEXT_KEY);
	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	const getUsdBalance = ({
		amount,
		token,
		exchangeRate
	}: {
		amount: bigint;
		token: IcTokenToggleable | undefined;
		exchangeRate?: number;
	}): string | undefined => {
		if (isNullish(amount) || isNullish(token) || isNullish(exchangeRate)) {
			return;
		}

		const usdValue =
			formatTokenBigintToNumber({
				value: amount,
				unitName: token.decimals,
				displayDecimals: token.decimals
			}) * exchangeRate;

		return formatCurrency({
			value: usdValue,
			currency: $currentCurrency,
			exchangeRate: $currencyExchangeStore,
			language: $currentLanguage
		});
	};
</script>

<div class=" mb-4 overflow-y-auto overscroll-contain">
	<div class="flex w-full flex-row justify-between border-b border-solid border-primary pb-2">
		<span class="text-sm text-tertiary">{$i18n.swap.text.swap_provider}</span>
		<span class="text-sm text-tertiary">{$i18n.swap.text.you_receive}</span>
	</div>
	<ul class="list-none">
		{#each $swapAmountsStore?.swaps ?? [] as swap (swap.provider)}
			{#if nonNullish($destinationToken) && nonNullish($swapAmountsStore)}
				<li class="logo-button-list-item" data-testid="provider-item">
					<SwapProviderListItem
						amount={swap.receiveAmount}
						dapp={dAppDescriptions.find(({ id }) => id === swap.provider.toLowerCase())}
						destinationToken={$destinationToken as IcTokenToggleable}
						isBestRate={swap.provider === $swapAmountsStore.swaps[0].provider}
						usdBalance={getUsdBalance({
							amount: swap.receiveAmount,
							token: $destinationToken as IcTokenToggleable,
							exchangeRate: $destinationTokenExchangeRate
						})}
						on:click={() => dispatch('icSelectProvider', swap)}
					/>
				</li>
			{/if}
		{/each}
	</ul>
</div>

<ButtonGroup>
	<ButtonCancel fullWidth={true} onclick={() => dispatch('icCloseProviderList')} />
</ButtonGroup>
