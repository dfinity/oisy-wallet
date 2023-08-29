<script lang="ts">
	import type { Transaction } from '$lib/types/transaction';
	import { BigNumber } from '@ethersproject/bignumber';
	import { Utils } from 'alchemy-sdk';
	import { isTransactionPending } from '$lib/utils/transactions.utils';
	import IconReceive from '$lib/components/icons/IconReceive.svelte';
	import type { SvelteComponent } from 'svelte';
	import { addressStore } from '$lib/stores/address.store';
	import IconSend from '$lib/components/icons/IconSend.svelte';
	import { nonNullish } from '@dfinity/utils';
	import { formatToDate } from '$lib/utils/date.utils';
	import Card from '$lib/components/ui/Card.svelte';

	export let transaction: Transaction;

	let blockNumber: number | undefined;
	let from: string;
	let to: string | undefined;
	let value: BigNumber;
	let timestamp: number | undefined;

	$: ({ blockNumber, from, to, value, timestamp } = transaction);

	let type: 'send' | 'receive';
	$: type = from === $addressStore ? 'send' : 'receive';

	let icon: typeof SvelteComponent;
	$: icon = type === 'send' ? IconSend : IconReceive;

	let amount: BigNumber;
	$: amount = type == 'send' ? value.mul(BigNumber.from(-1)) : value;

	let pending: boolean;
	$: pending = isTransactionPending(transaction);
</script>

<Card {pending}>
	{`${type === 'send' ? 'Send' : 'Receive'}`}

	<div class="relative" slot="icon">
		<div class="rounded-50 bg-deep-violet opacity-15" style="width: 3rem; aspect-ratio: 1/1" />
		<svelte:component this={icon} styleClass={`inset-center ${pending ? 'opacity-15' : ''}`} />
	</div>

	<svelte:fragment slot="amount">{Utils.formatEther(amount.toString())}</svelte:fragment>
	<svelte:fragment slot="description">
		{#if nonNullish(timestamp)}
			{formatToDate(timestamp)}
		{/if}
	</svelte:fragment>
</Card>
