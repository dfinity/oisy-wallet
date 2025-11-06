<script lang="ts">
	import { getContext, type Snippet } from 'svelte';
	import type { IcToken } from '$icp/types/ic-token';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { formatCurrency, formatTokenBigintToNumber } from '$lib/utils/format.utils';

	interface Props {
		label: Snippet;
	}

	let { label }: Props = $props();

	const { sendTokenSymbol, sendTokenExchangeRate, sendToken, sendTokenDecimals } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	let tokenFee = $derived(
		formatTokenBigintToNumber({
			value: ($sendToken as IcToken).fee,
			displayDecimals: $sendTokenDecimals,
			unitName: $sendTokenDecimals
		})
	);
</script>

<ModalValue {label}>
	{#snippet mainValue()}
		{tokenFee}
		{$sendTokenSymbol}
	{/snippet}

	{#snippet secondaryValue()}
		{formatCurrency({
			value: tokenFee * ($sendTokenExchangeRate ?? 0),
			currency: $currentCurrency,
			exchangeRate: $currencyExchangeStore,
			language: $currentLanguage,
			notBelowThreshold: true
		})}
	{/snippet}
</ModalValue>
