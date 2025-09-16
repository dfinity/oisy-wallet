<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { IC_TOKEN_FEE_CONTEXT_KEY, type IcTokenFeeContext } from '$icp/stores/ic-token-fee.store';
	import SwapFee from '$lib/components/swap/SwapFee.svelte';
	import ModalExpandableValues from '$lib/components/ui/ModalExpandableValues.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import { formatToken, formatCurrency } from '$lib/utils/format.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	const { destinationToken, sourceToken, sourceTokenExchangeRate, isSourceTokenIcrc2 } =
		getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const { store: icTokenFeeStore } = getContext<IcTokenFeeContext>(IC_TOKEN_FEE_CONTEXT_KEY);

	let sourceTokenTransferFeeDisplay = $derived(
		nonNullish($sourceToken) && nonNullish($icTokenFeeStore?.[$sourceToken.symbol])
			? formatToken({
					value: $icTokenFeeStore[$sourceToken.symbol],
					displayDecimals: $sourceToken.decimals,
					unitName: $sourceToken.decimals
				})
			: '0'
	);

	let sourceTokenTransferFee = $derived(Number(sourceTokenTransferFeeDisplay));

	let sourceTokenApproveFeeDisplay = $derived(
		$isSourceTokenIcrc2 ? sourceTokenTransferFeeDisplay : '0'
	);

	let sourceTokenApproveFee = $derived(Number(sourceTokenApproveFeeDisplay));

	let sourceTokenTotalFeeUSD = $derived(
		nonNullish($sourceTokenExchangeRate)
			? (sourceTokenTransferFee + sourceTokenApproveFee) * $sourceTokenExchangeRate
			: 0
	);
</script>

{#if nonNullish($destinationToken) && nonNullish($sourceToken)}
	<ModalExpandableValues>
		{#snippet listHeader()}
			<ModalValue>
				{#snippet label()}
					{$i18n.swap.text.total_fee}
				{/snippet}

				{#snippet mainValue()}
					{#if isNullish($icTokenFeeStore?.[$sourceToken.symbol])}
						<div class="w-14 sm:w-16">
							<SkeletonText />
						</div>
					{:else if isNullish($sourceTokenExchangeRate)}
						{sourceTokenTransferFee + sourceTokenApproveFee} {getTokenDisplaySymbol($sourceToken)}
					{:else}
						{formatCurrency({
							value: sourceTokenTotalFeeUSD,
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
			{#if $isSourceTokenIcrc2 && sourceTokenApproveFee !== 0}
				<SwapFee
					fee={sourceTokenApproveFeeDisplay}
					feeLabel={$i18n.swap.text.approval_fee}
					symbol={getTokenDisplaySymbol($sourceToken)}
				/>
			{/if}

			<SwapFee
				fee={sourceTokenTransferFeeDisplay}
				feeLabel={$i18n.swap.text.network_fee}
				symbol={getTokenDisplaySymbol($sourceToken)}
			/>
		{/snippet}
	</ModalExpandableValues>
{/if}
