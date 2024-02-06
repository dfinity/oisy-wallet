<script lang="ts">
	import { BigNumber } from '@ethersproject/bignumber';
	import IconReceive from '$lib/components/icons/IconReceive.svelte';
	import { type ComponentType, onMount } from 'svelte';
	import IconSend from '$lib/components/icons/IconSend.svelte';
	import { nonNullish } from '@dfinity/utils';
	import Card from '$lib/components/ui/Card.svelte';
	import { formatNanosecondsToDate, formatToken } from '$lib/utils/format.utils';
	import RoundedIcon from '$lib/components/ui/RoundedIcon.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import { token } from '$lib/derived/token.derived';
	import { mapIcTransaction } from '$icp/utils/ic-transactions.utils';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { IcToken, IcTransaction, IcTransactionType, IcTransactionUi } from '$icp/types/ic';
	import { authStore } from '$lib/stores/auth.store';
	import IconConvert from '$lib/components/icons/IconConvert.svelte';

	export let transaction: IcTransaction;

	let uiTransaction: IcTransactionUi | undefined;

	onMount(() => {
		try {
			uiTransaction = mapIcTransaction({
				transaction,
				token: $token as IcToken,
				identity: $authStore.identity
			});
		} catch (err: unknown) {
			toastsError({
				msg: { text: 'Cannot map the transaction for display purpose.' },
				err
			});
		}
	});

	let transactionType: IcTransactionType | undefined;
	let transactionTypeLabel: string | undefined;
	let value: BigNumber | undefined;
	let timestamp: bigint | undefined;
	let incoming: boolean | undefined;

	$: transactionType = uiTransaction?.type;
	$: transactionTypeLabel = uiTransaction?.typeLabel;
	$: value = uiTransaction?.value;
	$: timestamp = uiTransaction?.timestamp;
	$: incoming = uiTransaction?.incoming;

	let pending = false;
	$: pending = uiTransaction?.status === 'pending';

	let icon: ComponentType;
	$: icon =
		nonNullish(transactionType) && ['approve', 'burn', 'mint'].includes(transactionType)
			? IconConvert
			: incoming === false
				? IconSend
				: IconReceive;

	let amount: BigNumber | undefined;
	$: amount = !incoming && nonNullish(value) ? value.mul(BigNumber.from(-1)) : value;
</script>

<button on:click={() => modalStore.openIcTransaction(uiTransaction)} class="block w-full border-0">
	<Card {pending}>
		<span class="capitalize">{transactionTypeLabel ?? transactionType}</span>

		<RoundedIcon slot="icon" {icon} />

		<svelte:fragment slot="amount">
			{nonNullish(amount)
				? formatToken({
						value: amount,
						unitName: $token.decimals
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
