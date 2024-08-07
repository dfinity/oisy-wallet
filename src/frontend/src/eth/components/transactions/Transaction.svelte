<script lang="ts">
	import type { Transaction } from '$lib/types/transaction';
	import { BigNumber } from '@ethersproject/bignumber';
	import { isTransactionPending } from '$eth/utils/transactions.utils';
	import IconReceive from '$lib/components/icons/IconReceive.svelte';
	import type { ComponentType } from 'svelte';
	import { ethAddress } from '$lib/derived/address.derived';
	import IconSend from '$lib/components/icons/IconSend.svelte';
	import { nonNullish } from '@dfinity/utils';
	import Card from '$lib/components/ui/Card.svelte';
	import { formatSecondsToDate } from '$lib/utils/format.utils';
	import RoundedIcon from '$lib/components/ui/RoundedIcon.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import Amount from '$lib/components/ui/Amount.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import TransactionPending from '$lib/components/transactions/TransactionPending.svelte';

	export let transaction: Transaction;

	let from: string;
	let value: BigNumber;
	let timestamp: number | undefined;
	let displayTimestamp: number | undefined;

	$: ({ from, value, timestamp, displayTimestamp } = transaction);

	let type: 'send' | 'receive';
	$: type = from?.toLowerCase() === $ethAddress?.toLowerCase() ? 'send' : 'receive';

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
	<Card>
		{`${type === 'send' ? $i18n.send.text.send : $i18n.receive.text.receive}`}

		<RoundedIcon slot="icon" {icon} iconStyleClass={pending ? 'opacity-10' : ''} />

		<Amount {amount} slot="amount" />

		<svelte:fragment slot="description">
			{#if nonNullish(transactionDate)}
				{formatSecondsToDate(transactionDate)}
			{/if}

			<TransactionPending {pending} />
		</svelte:fragment>
	</Card>
</button>
