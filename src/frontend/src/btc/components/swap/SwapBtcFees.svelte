<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import ModalExpandableValues from '$lib/components/ui/ModalExpandableValues.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import { SwapProvider } from '$lib/types/swap';
	import { resolveText } from '$lib/utils/i18n.utils';

	const { sourceToken, sourceTokenExchangeRate } = getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	// The Bitcoin counterpart of `SwapFees`, which cannot serve this form: it reads the IC
	// token fee context, which only the ICP-source wizard sets. Same rule as there — every
	// fee the quote priced, so the total is the user's whole cost of the conversion.
	let fees = $derived(
		$swapAmountsStore?.selectedProvider?.provider === SwapProvider.CHAIN_FUSION
			? $swapAmountsStore.selectedProvider.swapDetails.sourceFees
			: undefined
	);

	let totalFee = $derived(fees?.reduce((acc, { fee }) => acc + fee, ZERO));
</script>

{#if nonNullish(fees) && nonNullish(totalFee) && nonNullish($sourceToken)}
	<ModalExpandableValues>
		{#snippet listHeader()}
			<FeeDisplay
				decimals={$sourceToken.decimals}
				exchangeRate={$sourceTokenExchangeRate}
				feeAmount={totalFee}
				symbol={$sourceToken.symbol}
				zeroAmountLabel={$i18n.fee.text.zero_fee}
			>
				{#snippet label()}{$i18n.swap.text.total_fee}{/snippet}
			</FeeDisplay>
		{/snippet}

		{#snippet listItems()}
			{#each fees as { labelPath, fee, token } (labelPath)}
				<FeeDisplay
					decimals={token.decimals}
					exchangeRate={$exchanges?.[token.id]?.usd}
					feeAmount={fee}
					symbol={token.symbol}
					zeroAmountLabel={$i18n.fee.text.zero_fee}
				>
					{#snippet label()}{resolveText({ i18n: $i18n, path: labelPath })}{/snippet}
				</FeeDisplay>
			{/each}
		{/snippet}
	</ModalExpandableValues>
{/if}
