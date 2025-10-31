<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import SendDataAmount from '$lib/components/send/SendDataAmount.svelte';
	import SendDataApplication from '$lib/components/send/SendDataApplication.svelte';
	import SendDataDestination from '$lib/components/send/SendDataDestination.svelte';
	import SendSource from '$lib/components/send/SendSource.svelte';
	import type { OptionBalance } from '$lib/types/balance';
	import type { Token } from '$lib/types/token';

	interface Props {
		destination: string | null;
		amount?: bigint;
		token: Token;
		exchangeRate?: number;
		balance: OptionBalance;
		source: string;
		application: string;
		showNullishAmountLabel?: boolean;
		sourceNetwork: Snippet;
		destinationNetwork?: Snippet;
		children?: Snippet;
	}

	let {
		destination,
		amount,
		token,
		exchangeRate,
		balance,
		source,
		application,
		showNullishAmountLabel = false,
		sourceNetwork,
		destinationNetwork,
		children
	}: Props = $props();
</script>

<SendDataApplication {application} />

{@render sourceNetwork()}

{@render destinationNetwork?.()}

<SendDataAmount {amount} {exchangeRate} showNullishLabel={showNullishAmountLabel} {token} />

<SendSource {balance} {exchangeRate} {source} {token} />

{#if nonNullish(destination)}
	<SendDataDestination {destination} />
{/if}

{@render children?.()}
