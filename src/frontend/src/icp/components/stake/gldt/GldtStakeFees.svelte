<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import type { IcToken } from '$icp/types/ic-token';
	import ModalExpandableValues from '$lib/components/ui/ModalExpandableValues.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { formatCurrency, formatToken } from '$lib/utils/format.utils';

	const { sendToken, sendTokenExchangeRate, sendTokenSymbol, sendTokenDecimals } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	let tokenFeeDisplay = $derived(
		formatToken({
			value: ($sendToken as IcToken).fee,
			displayDecimals: $sendTokenDecimals,
			unitName: $sendTokenDecimals
		})
	);

	let totalTokenFee = $derived(Number(tokenFeeDisplay) * 2);
</script>

<ModalExpandableValues>
	{#snippet listHeader()}
		<ModalValue>
			{#snippet label()}
				{$i18n.fee.text.transaction_fees}
			{/snippet}

			{#snippet mainValue()}
				{#if nonNullish($sendTokenExchangeRate)}
					{formatCurrency({
						value: totalTokenFee * $sendTokenExchangeRate,
						currency: $currentCurrency,
						exchangeRate: $currencyExchangeStore,
						language: $currentLanguage,
						notBelowThreshold: true
					})}
				{:else}
					<div class="w-14 sm:w-16">
						<SkeletonText />
					</div>
				{/if}
			{/snippet}
		</ModalValue>
	{/snippet}

	{#snippet listItems()}
		<ModalValue>
			{#snippet label()}
				{$i18n.fee.text.network_fee}
			{/snippet}

			{#snippet mainValue()}
				{tokenFeeDisplay}
				{$sendTokenSymbol}
			{/snippet}
		</ModalValue>

		<ModalValue>
			{#snippet label()}
				{$i18n.fee.text.approval_fee}
			{/snippet}

			{#snippet mainValue()}
				{tokenFeeDisplay}
				{$sendTokenSymbol}
			{/snippet}
		</ModalValue>
	{/snippet}
</ModalExpandableValues>
