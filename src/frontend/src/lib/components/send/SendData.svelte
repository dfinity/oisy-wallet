<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import SendDataDestination from './SendDataDestination.svelte';
	import SendDataAmount from '$lib/components/send/SendDataAmount.svelte';
	import SendSource from '$lib/components/send/SendSource.svelte';
	import type { OptionBalance } from '$lib/types/balance';
	import type { Token } from '$lib/types/token';

	export let destination: string | null;
	export let amount: string | number | undefined = undefined;
	export let token: Token;
	export let balance: OptionBalance;
	export let source: string;
</script>

{#if nonNullish(destination)}
	<SendDataDestination {destination} />
{/if}

<slot name="network" />

<SendDataAmount {amount} {token} />

<slot />

<SendSource {token} {balance} {source} />

<slot name="fee" />
