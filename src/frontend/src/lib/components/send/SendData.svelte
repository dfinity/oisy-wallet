<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import SendDataAmount from '$lib/components/send/SendDataAmount.svelte';
	import SendDataDestination from '$lib/components/send/SendDataDestination.svelte';
	import SendSource from '$lib/components/send/SendSource.svelte';
	import type { OptionBalance } from '$lib/types/balance';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';

	export let destination: string | null;
	export let amount: OptionAmount = undefined;
	export let token: Token;
	export let exchangeRate: number | undefined = undefined;
	export let balance: OptionBalance;
	export let source: string;
	export let showNullishAmountLabel = false;
</script>

{#if nonNullish(destination)}
	<SendDataDestination {destination} />
{/if}

<slot name="network" />

<SendDataAmount {amount} {token} {exchangeRate} showNullishLabel={showNullishAmountLabel} />

<slot />

<SendSource {token} {balance} {source} {exchangeRate} />

<slot name="fee" />
