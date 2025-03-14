<script lang="ts">
	import IconCircleArrowDown from '$lib/components/icons/lucide/IconCircleArrowDown.svelte';
	import SwapToken from '$lib/components/swap/SwapToken.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';

	export let sendAmount: OptionAmount;
	export let receiveAmount: number | undefined;
	export let sourceToken: Token | undefined = undefined;
	export let destinationToken: Token | undefined = undefined;
	export let sourceTokenExchangeRate: number | undefined;
	export let destinationTokenExchangeRate: number | undefined;
</script>

<div class="mb-6 rounded-lg border border-solid border-tertiary bg-primary p-4 shadow-sm">
	<SwapToken token={sourceToken} amount={sendAmount} exchangeRate={sourceTokenExchangeRate}>
		<span slot="title">{$i18n.tokens.text.source_token_title}</span>
	</SwapToken>

	<div class="my-2 flex w-full items-center justify-between text-tertiary-inverted">
		<div class="h-[1px] w-[45%] bg-tertiary text-tertiary-inverted"></div>
		<IconCircleArrowDown />
		<div class="h-[1px] w-[45%] bg-tertiary text-tertiary-inverted"></div>
	</div>

	<SwapToken
		token={destinationToken}
		amount={receiveAmount}
		exchangeRate={destinationTokenExchangeRate}
	>
		<span slot="title">{$i18n.tokens.text.destination_token_title}</span>
	</SwapToken>
</div>
