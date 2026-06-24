<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';

	interface Props {
		// Provider fee, base units of the supplied token.
		inflowFee?: bigint;
	}

	let { inflowFee }: Props = $props();

	const { sendToken, sendTokenSymbol, sendTokenExchangeRate } =
		getContext<SendContext>(SEND_CONTEXT_KEY);
</script>

{#if nonNullish(inflowFee)}
	<FeeDisplay
		decimals={$sendToken.decimals}
		exchangeRate={$sendTokenExchangeRate}
		feeAmount={inflowFee}
		symbol={$sendTokenSymbol}
	>
		{#snippet label()}{$i18n.liquidium.text.provider_fee}{/snippet}
	</FeeDisplay>
{/if}
