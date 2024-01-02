<script lang="ts">
	import { BigNumber } from '@ethersproject/bignumber';
	import IconReceive from '$lib/components/icons/IconReceive.svelte';
	import { type ComponentType, onMount } from 'svelte';
	import IconSend from '$lib/components/icons/IconSend.svelte';
	import { nonNullish } from '@dfinity/utils';
	import Card from '$lib/components/ui/Card.svelte';
	import { formatNanosecondsToDate, formatTokenShort } from '$lib/utils/format.utils';
	import RoundedIcon from '$lib/components/ui/RoundedIcon.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import { token, tokenId } from '$lib/derived/token.derived';
	import { mapIcTransaction } from '$lib/utils/ic-transactions.utils';
	import { icpAccountIdentifierStore } from '$lib/derived/icp.derived';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { IcTransaction, IcTransactionUi } from '$lib/types/ic';

	export let transaction: IcTransaction;

	let uiTransaction: IcTransactionUi | undefined;

	onMount(() => {
		try {
			uiTransaction = mapIcTransaction({
				transaction,
				tokenId: $tokenId
			});
		} catch (err: unknown) {
			toastsError({
				msg: { text: 'Cannot map the transaction for display purpose.' },
				err
			});
		}
	});

	let from: string | undefined;
	let value: BigNumber | undefined;
	let timestamp: bigint | undefined;

	$: from = uiTransaction?.from;
	$: value = uiTransaction?.value;
	$: timestamp = uiTransaction?.timestamp;

	let type: 'send' | 'receive';
	$: type =
		from?.toLowerCase() === $icpAccountIdentifierStore?.toHex().toLowerCase() ? 'send' : 'receive';

	let icon: ComponentType;
	$: icon = type === 'send' ? IconSend : IconReceive;

	let amount: BigNumber | undefined;
	$: amount = type == 'send' && nonNullish(value) ? value.mul(BigNumber.from(-1)) : value;
</script>

<button on:click={() => modalStore.openIcTransaction(uiTransaction)} class="block w-full">
	<Card>
		{`${type === 'send' ? 'Send' : 'Receive'}`}

		<RoundedIcon slot="icon" {icon} />

		<svelte:fragment slot="amount">
			{nonNullish(amount)
				? formatTokenShort({
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
