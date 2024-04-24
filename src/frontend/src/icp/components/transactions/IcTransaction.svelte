<script lang="ts">
	import { BigNumber } from '@ethersproject/bignumber';
	import IconReceive from '$lib/components/icons/IconReceive.svelte';
	import { type ComponentType } from 'svelte';
	import IconSend from '$lib/components/icons/IconSend.svelte';
	import { nonNullish } from '@dfinity/utils';
	import Card from '$lib/components/ui/Card.svelte';
	import { formatNanosecondsToDate } from '$lib/utils/format.utils';
	import RoundedIcon from '$lib/components/ui/RoundedIcon.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import type { IcTransactionType, IcTransactionUi } from '$icp/types/ic';
	import IconMint from '$lib/components/icons/IconMint.svelte';
	import IconBurn from '$lib/components/icons/IconBurn.svelte';
	import Amount from '$lib/components/ui/Amount.svelte';
	import IcTransactionLabel from '$icp/components/transactions/IcTransactionLabel.svelte';

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
	$: icon = ['burn', 'approve'].includes(transactionType)
		? IconBurn
		: transactionType === 'mint'
			? IconMint
			: incoming === false
				? IconSend
				: IconReceive;

	let amount: bigint | undefined;
	$: amount = !incoming && nonNullish(value) ? value * -1n : value;
</script>

<button on:click={() => modalStore.openIcTransaction(transaction)} class="block w-full border-0">
	<Card {pending}>
		<span class="capitalize"
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
		</svelte:fragment>
	</Card>
</button>
