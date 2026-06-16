<script lang="ts">
	import IconCircleArrowDown from '$lib/components/icons/lucide/IconCircleArrowDown.svelte';
	import SwapToken from '$lib/components/swap/SwapToken.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';

	interface Props {
		sendAmount: OptionAmount;
		receiveAmount?: number;
		sourceToken?: Token;
		destinationToken?: Token;
		sourceTokenExchangeRate?: number;
		destinationTokenExchangeRate?: number;
	}

	let {
		sendAmount,
		receiveAmount,
		sourceToken,
		destinationToken,
		sourceTokenExchangeRate,
		destinationTokenExchangeRate
	}: Props = $props();
</script>

<div class="border-tertiary bg-primary mb-6 rounded-lg border border-solid p-4 shadow-sm">
	<SwapToken amount={sendAmount} exchangeRate={sourceTokenExchangeRate} token={sourceToken}>
		{#snippet title()}
			{$i18n.tokens.text.source_token_title}
		{/snippet}
	</SwapToken>

	<div class="text-tertiary-inverted my-2 flex w-full items-center justify-between">
		<div class="bg-tertiary text-tertiary-inverted h-[1px] w-[45%]"></div>
		<IconCircleArrowDown />
		<div class="bg-tertiary text-tertiary-inverted h-[1px] w-[45%]"></div>
	</div>

	<SwapToken
		amount={receiveAmount}
		exchangeRate={destinationTokenExchangeRate}
		token={destinationToken}
	>
		{#snippet title()}
			{$i18n.tokens.text.destination_token_title}
		{/snippet}
	</SwapToken>
</div>
