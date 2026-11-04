<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
	import SwapProviderDetails from '$lib/components/swap/SwapProviderDetails.svelte';
	import SwapProviderListItem from '$lib/components/swap/SwapProviderListItem.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import {
		SWAP_MODAL_SELECT_PROVIDER_STEP,
		SWAP_SELECTED_PROVIDER_DETAILS
	} from '$lib/constants/test-ids.constants';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { SwapMappedResult } from '$lib/types/swap';
	import { formatTokenBigintToNumber, formatCurrency } from '$lib/utils/format.utils';
	import { replacePlaceholders, resolveText } from '$lib/utils/i18n.utils';
	import { findSwapProvider } from '$lib/utils/swap.utils';

	interface Props {
		slippageValue?: OptionAmount;
		onSelectProvider: (swap: SwapMappedResult) => void;
		onCloseProviderList: () => void;
	}

	let { slippageValue, onSelectProvider, onCloseProviderList }: Props = $props();

	const { destinationToken, destinationTokenExchangeRate } =
		getContext<SwapContext>(SWAP_CONTEXT_KEY);
	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	let selectedProvider = $derived($swapAmountsStore?.selectedProvider);
	let selectedDApp = $derived(
		nonNullish(selectedProvider) ? findSwapProvider(selectedProvider.provider) : undefined
	);
	let offerCount = $derived($swapAmountsStore?.swaps.length ?? 0);
	// With one offer the card is the whole list, so the list would only repeat it.
	let showOffers = $derived(isNullish(selectedDApp) || offerCount > 1);

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

<div class=" mb-4 overflow-y-auto overscroll-contain" data-tid={SWAP_MODAL_SELECT_PROVIDER_STEP}>
	{#if nonNullish(selectedProvider) && nonNullish(selectedDApp)}
		<!-- What the form's Smart Swap cell summarises: the offer it picked, then all offers below.
		The card is the one mark of the pick, so the rows carry no check, and it leaves out what each
		row already shows, the website and Best Rate. It is the form's Smart Swap card (fill,
		faintest border, padding), so the step opens on the card that was tapped. -->
		<section class:mb-6={showOffers} data-tid={SWAP_SELECTED_PROVIDER_DETAILS}>
			<span class="mb-2 block px-2 text-sm text-tertiary"
				>{$i18n.swap.text.smart_swap_selected_offer}</span
			>
			<div class="rounded-lg border border-tertiary bg-secondary px-4 py-3">
				<div class="mb-2 flex items-center gap-3">
					<Logo
						alt={replacePlaceholders($i18n.dapps.alt.logo, {
							$dAppName: resolveText({ i18n: $i18n, path: selectedDApp.name })
						})}
						size="md"
						src={selectedDApp.logo}
					/>
					<span class="min-w-0 truncate text-lg font-bold"
						>{resolveText({ i18n: $i18n, path: selectedDApp.name })}</span
					>
				</div>
				<SwapProviderDetails provider={selectedProvider} showWebsite={false} {slippageValue} />
			</div>
		</section>
	{/if}

	{#if showOffers}
		<!-- px-2 matches the offer rows' inset, so both columns line up with their values. -->
		<div
			class="flex w-full flex-row justify-between border-b border-solid border-primary px-2 pb-2"
		>
			<span class="text-sm text-tertiary">{$i18n.swap.text.smart_swap_offers}</span>
			<span class="text-sm text-tertiary">{$i18n.swap.text.you_receive}</span>
		</div>
		<!-- Tapping the offer already in use only goes back: selecting it would pin the automatic pick
		as a manual one, and a better offer in the next round could no longer replace it. -->
		<ul class="list-none">
			{#each $swapAmountsStore?.swaps ?? [] as swap (swap.provider)}
				{#if nonNullish($destinationToken) && nonNullish($swapAmountsStore)}
					<li class="logo-button-list-item" data-testid="provider-item">
						<SwapProviderListItem
							amount={swap.receiveAmount}
							dapp={findSwapProvider(swap.provider)}
							destinationToken={$destinationToken as IcTokenToggleable}
							isBestRate={swap.provider === $swapAmountsStore.swaps[0].provider}
							onClick={() =>
								swap.provider === selectedProvider?.provider
									? onCloseProviderList()
									: onSelectProvider(swap)}
							usdBalance={getUsdBalance({
								amount: swap.receiveAmount,
								token: $destinationToken as IcTokenToggleable,
								exchangeRate: $destinationTokenExchangeRate
							})}
						/>
					</li>
				{/if}
			{/each}
		</ul>
	{/if}
</div>

<ButtonGroup>
	<ButtonBack fullWidth onclick={onCloseProviderList} />
</ButtonGroup>
