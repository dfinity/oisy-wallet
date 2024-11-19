<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import type { Readable } from 'svelte/store';
	import { slide } from 'svelte/transition';
	import BtcConvertFeeTotal from '$btc/components/convert/BtcConvertFeeTotal.svelte';
	import BtcConvertFees from '$btc/components/convert/BtcConvertFees.svelte';
	import BtcSendWarnings from '$btc/components/send/BtcSendWarnings.svelte';
	import {
		BtcPendingSentTransactionsStatus,
		initPendingSentTransactionsStatus
	} from '$btc/derived/btc-pending-sent-transactions-status.derived';
	import { UTXOS_FEE_CONTEXT_KEY, type UtxosFeeContext } from '$btc/stores/utxos-fee.store';
	import ConvertForm from '$lib/components/convert/ConvertForm.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import { invalidAmount } from '$lib/utils/input.utils';

	export let source: string;
	export let sendAmount: OptionAmount;
	export let receiveAmount: number | undefined;

	const { store: storeUtxosFeeData } = getContext<UtxosFeeContext>(UTXOS_FEE_CONTEXT_KEY);

	let insufficientFunds: boolean;
	let insufficientFundsForFee: boolean;

	let hasPendingTransactionsStore: Readable<BtcPendingSentTransactionsStatus>;
	$: hasPendingTransactionsStore = initPendingSentTransactionsStatus(source);

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
			<div transition:slide={SLIDE_DURATION} data-tid="btc-convert-form-insufficient-funds-for-fee">
				<MessageBox level="error"
					><span class="text-error">{$i18n.convert.assertion.insufficient_funds_for_fee}</span
					></MessageBox
				>
			</div>
		{:else if nonNullish($hasPendingTransactionsStore)}
			<div class="mb-4" data-tid="btc-convert-form-send-warnings">
				<BtcSendWarnings
					utxosFee={$storeUtxosFeeData?.utxosFee}
					pendingTransactionsStatus={$hasPendingTransactionsStore}
				/>
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
