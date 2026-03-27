<script lang="ts">
	import { getContext } from 'svelte';
	import { getTokenFee } from '$icp/utils/token.utils';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';

	const { sendToken, sendTokenDecimals, sendTokenSymbol, sendTokenExchangeRate, isIcBurning } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	let fee = $derived($isIcBurning ? ZERO : getTokenFee($sendToken));
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
