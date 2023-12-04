<script lang="ts">
	import type { Transaction } from '$lib/types/transaction';
	import { BigNumber } from '@ethersproject/bignumber';
	import { isTransactionPending } from '$lib/utils/transactions.utils';
	import IconReceive from '$lib/components/icons/IconReceive.svelte';
	import type { ComponentType } from 'svelte';
	import { addressStore } from '$lib/stores/address.store';
	import IconSend from '$lib/components/icons/IconSend.svelte';
	import { nonNullish } from '@dfinity/utils';
	import Card from '$lib/components/ui/Card.svelte';
	import { formatToDate, formatTokenShort } from '$lib/utils/format.utils';
	import RoundedIcon from '$lib/components/ui/RoundedIcon.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import { token } from '$lib/derived/token.derived';

	export let transaction: Transaction;

	let from: string;
	let value: BigNumber;
	let timestamp: number | undefined;
	let displayTimestamp: number | undefined;

	$: ({ from, value, timestamp, displayTimestamp } = transaction);

	let type: 'send' | 'receive';
	$: type = from?.toLowerCase() === $addressStore?.toLowerCase() ? 'send' : 'receive';

	let icon: ComponentType;
	$: icon = type === 'send' ? IconSend : IconReceive;

	let amount: BigNumber;
	$: amount = type == 'send' ? value.mul(BigNumber.from(-1)) : value;

	let pending: boolean;
	$: pending = isTransactionPending(transaction);

	let transactionDate: number | undefined;
	$: transactionDate = timestamp ?? displayTimestamp;
</script>

<button on:click={() => modalStore.openTransaction(transaction)} class="contents">
	<Card {pending}>
		{`${type === 'send' ? 'Send' : 'Receive'}`}

		<RoundedIcon slot="icon" {icon} iconStyleClass={pending ? 'opacity-10' : ''} />

		<svelte:fragment slot="amount">
			{formatTokenShort({
				value: amount,
				unitName: $token.decimals
			})}</svelte:fragment
		>
		<svelte:fragment slot="description">
			{#if nonNullish(transactionDate)}
				{formatToDate(transactionDate)}
			{/if}
		</svelte:fragment>
	</Card>
</button>
