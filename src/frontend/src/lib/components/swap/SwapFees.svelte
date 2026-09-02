<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { IC_TOKEN_FEE_CONTEXT_KEY, type IcTokenFeeContext } from '$icp/stores/ic-token-fee.store';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import SwapFee from '$lib/components/swap/SwapFee.svelte';
	import ModalExpandableValues from '$lib/components/ui/ModalExpandableValues.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import { SwapProvider } from '$lib/types/swap';
	import { chainFusionFeeSectionFees } from '$lib/utils/chain-fusion-swap.utils';
	import { formatToken, formatCurrency } from '$lib/utils/format.utils';
	import { resolveText } from '$lib/utils/i18n.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface FeeRow {
		label: string;
		amount: string;
		symbol: string;
		usdValue: number | undefined;
		inSourceToken: boolean;
	}

	const { destinationToken, sourceToken, sourceTokenExchangeRate, isSourceTokenIcrc2 } =
		getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const { store: icTokenFeeStore } = getContext<IcTokenFeeContext>(IC_TOKEN_FEE_CONTEXT_KEY);

	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	const toUsdValue = ({
		amount,
		exchangeRate
	}: {
		amount: string;
		exchangeRate: number | undefined;
	}): number | undefined => (nonNullish(exchangeRate) ? Number(amount) * exchangeRate : undefined);

	let ledgerFeeDisplay = $derived(
		nonNullish($sourceToken) && nonNullish($icTokenFeeStore?.[$sourceToken.symbol])
			? formatToken({
					value: $icTokenFeeStore[$sourceToken.symbol],
					displayDecimals: $sourceToken.decimals,
					unitName: $sourceToken.decimals
				})
			: '0'
	);

	// Every fee the quote priced except the ones the provider sheet discloses instead, so the
	// total shown here is the user's cost out of balance. Nullish only when the offer is not a
	// Chain Fusion one, which is what picks the generic rows below — an empty array would not.
	let chainFusionFees = $derived(
		$swapAmountsStore?.selectedProvider?.provider === SwapProvider.CHAIN_FUSION
			? chainFusionFeeSectionFees([
					...$swapAmountsStore.selectedProvider.swapDetails.sourceFees,
					...$swapAmountsStore.selectedProvider.swapDetails.externalFees
				])
			: undefined
	);

	let sourceTokenApproveFeeDisplay = $derived($isSourceTokenIcrc2 ? ledgerFeeDisplay : '0');

	let genericFeeRows: FeeRow[] = $derived(
		nonNullish($sourceToken)
			? [
					...(($isSourceTokenIcrc2 ?? false) && Number(sourceTokenApproveFeeDisplay) !== 0
						? [
								{
									label: $i18n.swap.text.approval_fee,
									amount: sourceTokenApproveFeeDisplay,
									symbol: getTokenDisplaySymbol($sourceToken),
									usdValue: toUsdValue({
										amount: sourceTokenApproveFeeDisplay,
										exchangeRate: $sourceTokenExchangeRate
									}),
									inSourceToken: true
								}
							]
						: []),
					{
						label: $i18n.swap.text.network_fee,
						amount: ledgerFeeDisplay,
						symbol: getTokenDisplaySymbol($sourceToken),
						usdValue: toUsdValue({
							amount: ledgerFeeDisplay,
							exchangeRate: $sourceTokenExchangeRate
						}),
						inSourceToken: true
					}
				]
			: []
	);

	let chainFusionFeeRows: FeeRow[] = $derived(
		(chainFusionFees ?? []).map(({ labelPath, fee, token }) => {
			const amount = formatToken({
				value: fee,
				unitName: token.decimals,
				displayDecimals: token.decimals
			});

			return {
				label: resolveText({ i18n: $i18n, path: labelPath }),
				amount,
				symbol: getTokenDisplaySymbol(token),
				usdValue: toUsdValue({ amount, exchangeRate: $exchanges?.[token.id]?.usd }),
				inSourceToken: token.id === $sourceToken?.id
			};
		})
	);

	let feeRows = $derived(nonNullish(chainFusionFees) ? chainFusionFeeRows : genericFeeRows);

	let totalFeeUsd = $derived(
		feeRows.reduce<number | undefined>(
			(acc, { usdValue }) => (nonNullish(acc) && nonNullish(usdValue) ? acc + usdValue : undefined),
			0
		)
	);

	let sourceTokenSubtotal = $derived(
		feeRows.reduce(
			(acc, { amount, inSourceToken }) => (inSourceToken ? acc + Number(amount) : acc),
			0
		)
	);

	let isLoading = $derived(
		isNullish(chainFusionFees) &&
			(isNullish($sourceToken) ||
				isNullish($icTokenFeeStore?.[$sourceToken.symbol]) ||
				isNullish($isSourceTokenIcrc2))
	);
</script>

{#if nonNullish($destinationToken) && nonNullish($sourceToken)}
	<!-- A total of one fee is that fee: a collapsible whose only item repeats its header says
		 nothing, so a lone quote-priced row stands on its own under its own label, with its
		 fiat value like the header would have carried. -->
	{#if nonNullish(chainFusionFees) && chainFusionFees.length === 1}
		{@const [{ labelPath, fee, token }] = chainFusionFees}
		<FeeDisplay
			decimals={token.decimals}
			exchangeRate={$exchanges?.[token.id]?.usd}
			feeAmount={fee}
			symbol={getTokenDisplaySymbol(token)}
			zeroAmountLabel={$i18n.fee.text.zero_fee}
		>
			{#snippet label()}{resolveText({ i18n: $i18n, path: labelPath })}{/snippet}
		</FeeDisplay>
	{:else}
		<ModalExpandableValues>
			{#snippet listHeader()}
				<ModalValue>
					{#snippet label()}
						{$i18n.swap.text.total_fee}
					{/snippet}

					{#snippet mainValue()}
						{#if isLoading}
							<div class="w-14 sm:w-16">
								<SkeletonText />
							</div>
						{:else if isNullish(totalFeeUsd)}
							{sourceTokenSubtotal} {getTokenDisplaySymbol($sourceToken)}
						{:else}
							{formatCurrency({
								value: totalFeeUsd,
								currency: $currentCurrency,
								exchangeRate: $currencyExchangeStore,
								language: $currentLanguage,
								notBelowThreshold: true
							})}
						{/if}
					{/snippet}
				</ModalValue>
			{/snippet}

			{#snippet listItems()}
				{#each feeRows as { label, amount, symbol }, index (index)}
					<SwapFee fee={amount} feeLabel={label} {symbol} />
				{/each}
			{/snippet}
		</ModalExpandableValues>
	{/if}
{/if}
