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
		amount?: OptionAmount;
		token: Token;
		exchangeRate?: number;
		balance: OptionBalance;
		source: string;
		showNullishAmountLabel?: boolean;
		network?: Snippet;
		children?: Snippet;
		fee?: Snippet;
	}

	let {
		destination,
		amount = undefined,
		token,
		exchangeRate = undefined,
		balance,
		source,
		showNullishAmountLabel = false,
		network,
		children,
		fee
	}: Props = $props();
</script>

{#if nonNullish(destination)}
	<SendDataDestination {destination} />
{/if}

{@render network?.()}

<SendDataAmount {amount} {exchangeRate} showNullishLabel={showNullishAmountLabel} {token} />

{@render children?.()}

<SendSource {balance} {exchangeRate} {source} {token} />

{@render fee?.()}
