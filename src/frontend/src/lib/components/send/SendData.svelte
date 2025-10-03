<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import SendDataAmount from '$lib/components/send/SendDataAmount.svelte';
	import SendDataDestination from '$lib/components/send/SendDataDestination.svelte';
	import SendSource from '$lib/components/send/SendSource.svelte';
	import type { OptionBalance } from '$lib/types/balance';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';

	interface Props {
		destination: string | null;
		amount: OptionAmount;
		token: Token;
		exchangeRate?: number;
		balance: OptionBalance;
		source: string;
		showNullishAmountLabel?: boolean;
		sourceNetwork: Snippet;
		destinationNetwork?: Snippet;
		fee?: Snippet;
		children?: Snippet;
	}

	let {
		destination,
		amount,
		token,
		exchangeRate,
		balance,
		source,
		showNullishAmountLabel = false,
		sourceNetwork,
		destinationNetwork,
		fee,
		children
	}: Props = $props();
</script>

{@render sourceNetwork()}

{@render destinationNetwork?.()}

<SendDataAmount {amount} {exchangeRate} showNullishLabel={showNullishAmountLabel} {token} />

<SendSource {balance} {exchangeRate} {source} {token} />

{#if nonNullish(destination)}
	<SendDataDestination {destination} />
{/if}

{@render fee?.()}

{@render children?.()}
