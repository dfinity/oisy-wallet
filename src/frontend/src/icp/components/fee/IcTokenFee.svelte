<script lang="ts">
	import { getContext } from 'svelte';
	import type { OptionIcToken } from '$icp/types/ic-token';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';

	const { sendToken, sendTokenDecimals, sendTokenSymbol, sendTokenExchangeRate } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	let fee: bigint | undefined;
	$: fee = ($sendToken as OptionIcToken)?.fee;
</script>

<FeeDisplay
	decimals={$sendTokenDecimals}
	exchangeRate={$sendTokenExchangeRate}
	feeAmount={fee}
	symbol={$sendTokenSymbol}
>
	{#snippet label()}
		<span>{$i18n.fee.text.fee}</span>
	{/snippet}
</FeeDisplay>
