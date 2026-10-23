<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { CMC_NAME, CYCLES_LEDGER_DEPOSIT_FEE } from '$icp/constants/cmc.constants';
	import { toCyclesPerIcp } from '$icp/utils/cycles-mint.utils';
	import { getTokenFee } from '$icp/utils/token.utils';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { CYCLES_MINT_RATE } from '$lib/constants/test-ids.constants';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatToken } from '$lib/utils/format.utils';

	interface Props {
		xdrPermyriadPerIcp?: bigint;
		// Review names who mints; the form leaves it out.
		showMinter?: boolean;
	}

	let { xdrPermyriadPerIcp, showMinter = false }: Props = $props();

	const { sourceToken, destinationToken, sourceTokenExchangeRate, destinationTokenExchangeRate } =
		getContext<ConvertContext>(CONVERT_CONTEXT_KEY);

	// The CMC's rate has four decimals of an XDR, so four decimals of a TCYCLES.
	let cyclesPerIcp = $derived(
		nonNullish(xdrPermyriadPerIcp)
			? formatToken({
					value: toCyclesPerIcp(xdrPermyriadPerIcp),
					unitName: $destinationToken.decimals,
					displayDecimals: 4
				})
			: undefined
	);
</script>

<ModalValue>
	{#snippet label()}{$i18n.cycles_mint.text.rate}{/snippet}
	{#snippet mainValue()}
		{#if nonNullish(cyclesPerIcp)}
			<span data-tid={CYCLES_MINT_RATE}>
				1 {$sourceToken.symbol} ≈ {cyclesPerIcp}
				{$destinationToken.symbol}
			</span>
		{:else}
			<div class="w-24">
				<SkeletonText />
			</div>
		{/if}
	{/snippet}
</ModalValue>

<FeeDisplay
	decimals={$sourceToken.decimals}
	exchangeRate={$sourceTokenExchangeRate}
	feeAmount={getTokenFee($sourceToken)}
	symbol={$sourceToken.symbol}
>
	{#snippet label()}{$i18n.fee.text.network_fee}{/snippet}
</FeeDisplay>

<FeeDisplay
	decimals={$destinationToken.decimals}
	exchangeRate={$destinationTokenExchangeRate}
	feeAmount={CYCLES_LEDGER_DEPOSIT_FEE}
	symbol={$destinationToken.symbol}
>
	{#snippet label()}{$i18n.cycles_mint.text.cycles_ledger_fee}{/snippet}
</FeeDisplay>

{#if showMinter}
	<ModalValue>
		{#snippet label()}{$i18n.cycles_mint.text.minter}{/snippet}
		{#snippet mainValue()}{CMC_NAME}{/snippet}
	</ModalValue>
{/if}
