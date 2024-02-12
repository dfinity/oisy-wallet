<script lang="ts">
	import { BigNumber } from '@ethersproject/bignumber';
	import IconReceive from '$lib/components/icons/IconReceive.svelte';
	import { type ComponentType } from 'svelte';
	import IconSend from '$lib/components/icons/IconSend.svelte';
	import { nonNullish } from '@dfinity/utils';
	import Card from '$lib/components/ui/Card.svelte';
	import { formatNanosecondsToDate, formatToken } from '$lib/utils/format.utils';
	import RoundedIcon from '$lib/components/ui/RoundedIcon.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import { token } from '$lib/derived/token.derived';
	import type { IcTransactionType, IcTransactionUi } from '$icp/types/ic';
	import IconMint from '$lib/components/icons/IconMint.svelte';
	import IconBurn from '$lib/components/icons/IconBurn.svelte';
	import { HEIGHT_DECIMALS } from '$lib/constants/app.constants';

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
		<span class="capitalize">{transactionTypeLabel ?? transactionType}</span>

		<RoundedIcon slot="icon" {icon} />

		<svelte:fragment slot="amount">
			{nonNullish(amount)
				? formatToken({
						value: BigNumber.from(amount),
						unitName: $token.decimals,
						displayDecimals: HEIGHT_DECIMALS,
						trailingZeros: false
					})
				: ''}</svelte:fragment
		>
		<svelte:fragment slot="description">
			{#if nonNullish(timestamp)}
				{formatNanosecondsToDate(timestamp)}
			{/if}
		</svelte:fragment>
	</Card>
</button>
