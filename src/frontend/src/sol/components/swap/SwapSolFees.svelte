<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import ModalExpandableValues from '$lib/components/ui/ModalExpandableValues.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { type FeeContext, SOL_FEE_CONTEXT_KEY } from '$sol/stores/sol-fee.store';

	const {
		feeStore: networkFee,
		ataFeeStore: ataFee,
		feeDecimalsStore: decimals,
		feeSymbolStore: symbol,
		feeExchangeRateStore: exchangeRate
	}: FeeContext = getContext<FeeContext>(SOL_FEE_CONTEXT_KEY);

	let totalFee = $derived(
		nonNullish($networkFee) ? $networkFee + ($ataFee ?? ZERO) : undefined
	);
</script>

{#if nonNullish($symbol) && nonNullish($decimals) && nonNullish($networkFee)}
	{#if nonNullish($ataFee) && $ataFee > ZERO}
		<ModalExpandableValues>
			{#snippet listHeader()}
				<FeeDisplay
					decimals={$decimals}
					exchangeRate={$exchangeRate}
					feeAmount={totalFee}
					symbol={$symbol}
				>
					{#snippet label()}
						<span>{$i18n.fee.text.total_fee}</span>
					{/snippet}
				</FeeDisplay>
			{/snippet}

			{#snippet listItems()}
				<FeeDisplay
					decimals={$decimals}
					exchangeRate={$exchangeRate}
					feeAmount={$networkFee}
					symbol={$symbol}
				>
					{#snippet label()}
						<span>{$i18n.fee.text.network_fee}</span>
					{/snippet}
				</FeeDisplay>

				<FeeDisplay
					decimals={$decimals}
					exchangeRate={$exchangeRate}
					feeAmount={$ataFee}
					symbol={$symbol}
				>
					{#snippet label()}
						<span>{$i18n.fee.text.ata_fee}</span>
					{/snippet}
				</FeeDisplay>
			{/snippet}
		</ModalExpandableValues>
	{:else}
		<FeeDisplay
			decimals={$decimals}
			exchangeRate={$exchangeRate}
			feeAmount={$networkFee}
			symbol={$symbol}
		>
			{#snippet label()}
				<span>{$i18n.fee.text.network_fee}</span>
			{/snippet}
		</FeeDisplay>
	{/if}
{/if}
