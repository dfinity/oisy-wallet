<script lang="ts">
	import SendSource from '$lib/components/send/SendSource.svelte';
	import SendDataDestination from './SendDataDestination.svelte';
	import type { Token } from '$lib/types/token';
	import SendDataAmount from '$lib/components/send/SendDataAmount.svelte';
	import { nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';

	export let destination: string | null;
	export let amount: string | number | undefined = undefined;
	export let token: Token;
	export let balance: BigNumber | undefined | null;
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
