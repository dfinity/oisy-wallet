<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import SendDataAmount from '$lib/components/send/SendDataAmount.svelte';
	import SendDataApplication from '$lib/components/send/SendDataApplication.svelte';
	import SendDataDestination from '$lib/components/send/SendDataDestination.svelte';
	import SendSource from '$lib/components/send/SendSource.svelte';
	import type { OptionBalance } from '$lib/types/balance';
	import type { OptionToken } from '$lib/types/token';

	interface Props {
		destination: string | null;
		amount?: bigint;
		token: OptionToken;
		exchangeRate?: number;
		balance: OptionBalance;
		source: string;
		application: string;
		// A caller whose decode produced no amount has nothing to say in the amount and balance rows,
		// and a zero there would read as a figure the decode never produced. Both default to shown.
		showAmount?: boolean;
		showBalance?: boolean;
		showNullishAmountLabel?: boolean;
		showUnlimitedAmountLabel?: boolean;
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
		showAmount = true,
		showBalance = true,
		showNullishAmountLabel = false,
		showUnlimitedAmountLabel = false,
		sourceNetwork,
		destinationNetwork,
		children
	}: Props = $props();
</script>

<SendDataApplication {application} />

{@render sourceNetwork()}

{@render destinationNetwork?.()}

{#if showAmount}
	<SendDataAmount
		{amount}
		{exchangeRate}
		showNullishLabel={showNullishAmountLabel}
		showUnlimitedLabel={showUnlimitedAmountLabel}
		{token}
	/>
{/if}

<SendSource {balance} {exchangeRate} {showBalance} {source} {token} />

{#if nonNullish(destination)}
	<SendDataDestination {destination} />
{/if}

{@render children?.()}
