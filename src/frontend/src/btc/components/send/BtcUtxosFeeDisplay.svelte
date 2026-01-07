<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { UTXOS_FEE_CONTEXT_KEY, type UtxosFeeContext } from '$btc/stores/utxos-fee.store';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { OptionAmount } from '$lib/types/send';

	interface Props {
		amount: OptionAmount;
	}

	const { amount }: Props = $props();

	const { sendTokenExchangeRate, sendToken, sendTokenSymbol } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	const { store: storeUtxosFeeData } = getContext<UtxosFeeContext>(UTXOS_FEE_CONTEXT_KEY);

	let satoshisFee = $derived($storeUtxosFeeData?.utxosFee?.feeSatoshis);
</script>

<FeeDisplay
	decimals={$sendToken.decimals}
	exchangeRate={$sendTokenExchangeRate}
	feeAmount={satoshisFee}
	symbol={$sendTokenSymbol}
>
	{#snippet label()}{$i18n.fee.text.fee}{/snippet}
</FeeDisplay>
