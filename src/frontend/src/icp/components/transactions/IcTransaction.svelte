<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { type ComponentType } from 'svelte';
	import IcTransactionLabel from '$icp/components/transactions/IcTransactionLabel.svelte';
	import type { IcTransactionType, IcTransactionUi } from '$icp/types/ic-transaction';
	import IconConvert from '$lib/components/icons/IconConvert.svelte';
	import IconConvertFrom from '$lib/components/icons/IconConvertFrom.svelte';
	import IconConvertTo from '$lib/components/icons/IconConvertTo.svelte';
	import IconReceive from '$lib/components/icons/IconReceive.svelte';
	import IconSend from '$lib/components/icons/IconSend.svelte';
	import TransactionPending from '$lib/components/transactions/TransactionPending.svelte';
	import Amount from '$lib/components/ui/Amount.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import RoundedIcon from '$lib/components/ui/RoundedIcon.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import { formatNanosecondsToDate } from '$lib/utils/format.utils';

	export let transaction: IcTransactionUi;

	let transactionType: IcTransactionType;
	let transactionTypeLabel: string | undefined;
	let value: bigint | undefined;
	let timestamp: bigint | undefined;
	let incoming: boolean | undefined;

	$: ({
		type: transactionType,
		typeLabel: transactionTypeLabel,
		value,
		timestamp,
		incoming
	} = transaction);

	let pending = false;
	$: pending = transaction?.status === 'pending';

	let icon: ComponentType;
	$: icon =
		['burn', 'approve', 'mint'].includes(transactionType) && pending
			? IconConvert
			: ['burn', 'approve'].includes(transactionType)
				? IconConvertTo
				: transactionType === 'mint'
					? IconConvertFrom
					: incoming === false
						? IconSend
						: IconReceive;

	let amount: bigint | undefined;
	$: amount = !incoming && nonNullish(value) ? value * -1n : value;
</script>

<button on:click={() => modalStore.openIcTransaction(transaction)} class="block w-full border-0">
	<Card>
		<span class="inline-block first-letter:capitalize"
			><IcTransactionLabel label={transactionTypeLabel} fallback={transactionType} /></span
		>

		<RoundedIcon slot="icon" {icon} />

		<svelte:fragment slot="amount">
			{#if nonNullish(amount)}
				<Amount amount={BigNumber.from(amount)} />
			{/if}
		</svelte:fragment>

		<svelte:fragment slot="description">
			{#if nonNullish(timestamp)}
				{formatNanosecondsToDate(timestamp)}
			{/if}

			<TransactionPending {pending} />
		</svelte:fragment>
	</Card>
</button>
