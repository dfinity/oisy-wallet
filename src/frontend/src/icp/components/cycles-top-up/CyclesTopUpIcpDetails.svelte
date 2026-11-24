<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { CYCLES_LEDGER_DECIMALS } from '$icp/constants/cmc.constants';
	import { toCyclesPerIcp } from '$icp/utils/cycles-mint.utils';
	import { estimateCyclesTopUpCycles, formatTrillionCycles } from '$icp/utils/cycles-top-up.utils';
	import { getTokenFee } from '$icp/utils/token.utils';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { CYCLES_TOP_UP_ESTIMATE, CYCLES_TOP_UP_RATE } from '$lib/constants/test-ids.constants';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		// ICP e8s, without the fee.
		amount?: bigint;
		xdrPermyriadPerIcp?: bigint;
	}

	let { amount, xdrPermyriadPerIcp }: Props = $props();

	const { sourceToken, sourceTokenExchangeRate } = getContext<ConvertContext>(CONVERT_CONTEXT_KEY);

	// In trillions of cycles, never TCYCLES: the canister receives cycles, and no token is
	// involved.
	let estimate = $derived(
		nonNullish(xdrPermyriadPerIcp)
			? formatTrillionCycles(
					estimateCyclesTopUpCycles({ amount: amount ?? ZERO, xdrPermyriadPerIcp })
				)
			: undefined
	);

	// Four decimals, as Mint's rate: the CMC's rate has four decimals of an XDR.
	let cyclesPerIcp = $derived(
		nonNullish(xdrPermyriadPerIcp)
			? formatToken({
					value: toCyclesPerIcp(xdrPermyriadPerIcp),
					unitName: CYCLES_LEDGER_DECIMALS,
					displayDecimals: 4
				})
			: undefined
	);
</script>

{#snippet loading()}
	<div class="w-24">
		<SkeletonText />
	</div>
{/snippet}

<ModalValue>
	{#snippet label()}{$i18n.cycles_top_up.text.canister_receives}{/snippet}
	{#snippet mainValue()}
		{#if nonNullish(estimate)}
			<span data-tid={CYCLES_TOP_UP_ESTIMATE}>
				{replacePlaceholders($i18n.cycles_top_up.text.cycles_estimate, { $amount: estimate })}
			</span>
		{:else}
			{@render loading()}
		{/if}
	{/snippet}
</ModalValue>

<ModalValue>
	{#snippet label()}{$i18n.cycles_mint.text.rate}{/snippet}
	{#snippet mainValue()}
		{#if nonNullish(cyclesPerIcp)}
			<span data-tid={CYCLES_TOP_UP_RATE}>
				{replacePlaceholders($i18n.cycles_top_up.text.rate, {
					$token: $sourceToken.symbol,
					$amount: cyclesPerIcp
				})}
			</span>
		{:else}
			{@render loading()}
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
