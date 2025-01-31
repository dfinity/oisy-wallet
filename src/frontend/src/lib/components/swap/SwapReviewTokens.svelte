<script lang="ts">
	import { getContext } from 'svelte';
	import IconCircleArrowDown from '$lib/components/icons/lucide/IconCircleArrowDown.svelte';
	import SwapToken from '$lib/components/swap/SwapToken.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { OptionAmount } from '$lib/types/send';

	export let swapAmount: OptionAmount;
	export let receiveAmount: number | undefined;

	const { sourceToken, destinationToken, sourceTokenExchangeRate, destinationTokenExchangeRate } =
		getContext<SwapContext>(SWAP_CONTEXT_KEY);
</script>

<div class="mb-6 rounded-lg border border-solid border-tertiary bg-primary p-4 shadow">
	<SwapToken token={$sourceToken} amount={swapAmount} exchangeRate={$sourceTokenExchangeRate}>
		<span slot="title">{$i18n.swap.text.select_source_token_title}</span>
	</SwapToken>

	<div class="my-2 flex w-full items-center justify-between text-tertiary-inverted">
		<div class="h-[1px] w-[45%] bg-tertiary text-tertiary-inverted" />
		<IconCircleArrowDown />
		<div class="h-[1px] w-[45%] bg-tertiary text-tertiary-inverted" />
	</div>

	<SwapToken
		token={$destinationToken}
		amount={receiveAmount}
		exchangeRate={$destinationTokenExchangeRate}
	>
		<span slot="title">{$i18n.swap.text.select_destination_token_title}</span>
	</SwapToken>
</div>
