<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import type { Readable } from 'svelte/store';
	import BtcConvertFeeTotal from '$btc/components/convert/BtcConvertFeeTotal.svelte';
	import BtcConvertFees from '$btc/components/convert/BtcConvertFees.svelte';
	import BtcSendWarnings from '$btc/components/send/BtcSendWarnings.svelte';
	import {
		BtcPendingSentTransactionsStatus,
		initPendingSentTransactionsStatus
	} from '$btc/derived/btc-pending-sent-transactions-status.derived';
	import { UTXOS_FEE_CONTEXT_KEY, type UtxosFeeContext } from '$btc/stores/utxos-fee.store';
	import type { UtxosFee } from '$btc/types/btc-send';
	import ConvertForm from '$lib/components/convert/ConvertForm.svelte';
	import InsufficientFundsForFee from '$lib/components/fee/InsufficientFundsForFee.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import type { OptionAmount } from '$lib/types/send';
	import { invalidAmount } from '$lib/utils/input.utils';

	export let source: string;
	export let sendAmount: OptionAmount;
	export let receiveAmount: number | undefined;
	export let amountError = false;

	const { store: storeUtxosFeeData } = getContext<UtxosFeeContext>(UTXOS_FEE_CONTEXT_KEY);

	let insufficientFunds: boolean;
	let insufficientFundsForFee: boolean;

	$: amountError = insufficientFunds || insufficientFundsForFee;

	let hasPendingTransactionsStore: Readable<BtcPendingSentTransactionsStatus>;
	$: hasPendingTransactionsStore = initPendingSentTransactionsStatus(source);

	let utxosFee: UtxosFee | undefined;
	$: utxosFee = nonNullish(sendAmount) ? $storeUtxosFeeData?.utxosFee : undefined;

	let invalid: boolean;
	$: invalid =
		insufficientFunds ||
		insufficientFundsForFee ||
		invalidAmount(sendAmount) ||
		$hasPendingTransactionsStore !== BtcPendingSentTransactionsStatus.NONE ||
		isNullish($storeUtxosFeeData?.utxosFee?.utxos) ||
		$storeUtxosFeeData.utxosFee.utxos.length === 0;

	let totalFee: bigint | undefined;
</script>

<ConvertForm
	on:icNext
	bind:sendAmount
	bind:receiveAmount
	bind:insufficientFunds
	bind:insufficientFundsForFee
	{totalFee}
	disabled={invalid}
>
	<svelte:fragment slot="message">
		{#if insufficientFundsForFee}
			<InsufficientFundsForFee testId="btc-convert-form-insufficient-funds-for-fee" />
		{:else if nonNullish($hasPendingTransactionsStore)}
			<div class="mb-4" data-tid="btc-convert-form-send-warnings">
				<BtcSendWarnings {utxosFee} pendingTransactionsStatus={$hasPendingTransactionsStore} />
			</div>
		{/if}
	</svelte:fragment>

	<svelte:fragment slot="fee">
		<BtcConvertFees {sendAmount} />

		<Hr spacing="md" />

		<BtcConvertFeeTotal bind:totalFee />
	</svelte:fragment>

	<slot name="cancel" slot="cancel" />
</ConvertForm>
