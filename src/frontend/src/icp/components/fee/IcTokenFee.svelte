<script lang="ts">
	// TODO: component will be removed within migration to the new Send flow
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import type { OptionIcToken } from '$icp/types/ic-token';
	import ExchangeAmountDisplay from '$lib/components/exchange/ExchangeAmountDisplay.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';

	const { sendToken, sendTokenDecimals, sendTokenSymbol, sendTokenExchangeRate } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	let fee: bigint | undefined;
	$: fee = ($sendToken as OptionIcToken)?.fee;
</script>

<Value ref="fee">
	<svelte:fragment slot="label">{$i18n.fee.text.fee}</svelte:fragment>

	{#if nonNullish(fee)}
		<ExchangeAmountDisplay
			amount={fee}
			decimals={$sendTokenDecimals}
			symbol={$sendTokenSymbol}
			exchangeRate={$sendTokenExchangeRate}
		/>
	{/if}
</Value>
