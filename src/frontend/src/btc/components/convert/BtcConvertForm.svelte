<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { type Snippet, getContext } from 'svelte';
	import { run } from 'svelte/legacy';
	import type { Readable } from 'svelte/store';
	import BtcConvertFees from '$btc/components/convert/BtcConvertFees.svelte';
	import BtcSendWarnings from '$btc/components/send/BtcSendWarnings.svelte';
	import {
		BtcPendingSentTransactionsStatus,
		initPendingSentTransactionsStatus
	} from '$btc/derived/btc-pending-sent-transactions-status.derived';
	import { UTXOS_FEE_CONTEXT_KEY, type UtxosFeeContext } from '$btc/stores/utxos-fee.store';
	import type { UtxosFee } from '$btc/types/btc-send';
	import ConvertForm from '$lib/components/convert/ConvertForm.svelte';
	import { BTC_CONVERT_FORM_TEST_ID } from '$lib/constants/test-ids.constants';
	import {
		TOKEN_ACTION_VALIDATION_ERRORS_CONTEXT_KEY,
		type TokenActionValidationErrorsContext
	} from '$lib/stores/token-action-validation-errors.store';
	import type { OptionAmount } from '$lib/types/send';
	import { invalidAmount } from '$lib/utils/input.utils';

	interface Props {
		source: string;
		sendAmount: OptionAmount;
		receiveAmount: number | undefined;
		amountError?: boolean;
		cancel?: Snippet;
	}

	let {
		source,
		sendAmount = $bindable(),
		receiveAmount = $bindable(),
		amountError = $bindable(false),
		cancel
	}: Props = $props();

	const { store: storeUtxosFeeData } = getContext<UtxosFeeContext>(UTXOS_FEE_CONTEXT_KEY);

	const { insufficientFunds, insufficientFundsForFee } =
		getContext<TokenActionValidationErrorsContext>(TOKEN_ACTION_VALIDATION_ERRORS_CONTEXT_KEY);

	run(() => {
		amountError = $insufficientFunds || $insufficientFundsForFee;
	});

	let hasPendingTransactionsStore: Readable<BtcPendingSentTransactionsStatus> = $derived(
		initPendingSentTransactionsStatus(source)
	);

	let utxosFee: UtxosFee | undefined = $derived(
		nonNullish(sendAmount) ? $storeUtxosFeeData?.utxosFee : undefined
	);

	let invalid: boolean = $derived(
		$insufficientFunds ||
			$insufficientFundsForFee ||
			invalidAmount(sendAmount) ||
			$hasPendingTransactionsStore !== BtcPendingSentTransactionsStatus.NONE ||
			isNullish($storeUtxosFeeData?.utxosFee?.utxos) ||
			$storeUtxosFeeData.utxosFee.utxos.length === 0
	);

	let totalFee: bigint | undefined = $state();

	const cancel_render = $derived(cancel);
</script>

<ConvertForm
	disabled={invalid}
	testId={BTC_CONVERT_FORM_TEST_ID}
	{totalFee}
	on:icNext
	bind:sendAmount
	bind:receiveAmount
>
	{#snippet message()}
		{#if nonNullish($hasPendingTransactionsStore)}
			<div class="mb-4" data-tid="btc-convert-form-send-warnings">
				<BtcSendWarnings pendingTransactionsStatus={$hasPendingTransactionsStore} {utxosFee} />
			</div>
		{/if}
	{/snippet}

	{#snippet fee()}
		<BtcConvertFees bind:totalFee />
	{/snippet}

	{#snippet cancel()}
		{@render cancel_render?.()}
	{/snippet}
</ConvertForm>
