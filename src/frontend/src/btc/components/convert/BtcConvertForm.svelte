<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, type Snippet } from 'svelte';
	import BtcConvertFees from '$btc/components/convert/BtcConvertFees.svelte';
	import BtcSendWarnings from '$btc/components/send/BtcSendWarnings.svelte';
	import {
		BtcPendingSentTransactionsStatus,
		initPendingSentTransactionsStatus
	} from '$btc/derived/btc-pending-sent-transactions-status.derived';
	import { UTXOS_FEE_CONTEXT_KEY, type UtxosFeeContext } from '$btc/stores/utxos-fee.store';
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
		receiveAmount?: number;
		amountError?: boolean;
		onNext: () => void;
		cancel: Snippet;
	}

	let {
		source,
		sendAmount = $bindable(),
		receiveAmount = $bindable(),
		amountError = $bindable(),
		onNext,
		cancel
	}: Props = $props();

	const { store: storeUtxosFeeData } = getContext<UtxosFeeContext>(UTXOS_FEE_CONTEXT_KEY);

	const { insufficientFunds, insufficientFundsForFee } =
		getContext<TokenActionValidationErrorsContext>(TOKEN_ACTION_VALIDATION_ERRORS_CONTEXT_KEY);

	$effect(() => {
		amountError = $insufficientFunds || $insufficientFundsForFee;
	});

	let hasPendingTransactionsStore = $derived(initPendingSentTransactionsStatus(source));

	let utxosFee = $derived(nonNullish(sendAmount) ? $storeUtxosFeeData?.utxosFee : undefined);

	let invalid = $derived(
		$insufficientFunds ||
			$insufficientFundsForFee ||
			invalidAmount(sendAmount) ||
			$hasPendingTransactionsStore !== BtcPendingSentTransactionsStatus.NONE ||
			isNullish($storeUtxosFeeData?.utxosFee?.utxos) ||
			$storeUtxosFeeData.utxosFee.utxos.length === 0
	);

	let totalFee = $state<bigint | undefined>();
</script>

<ConvertForm
	{cancel}
	disabled={invalid}
	{onNext}
	testId={BTC_CONVERT_FORM_TEST_ID}
	{totalFee}
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
</ConvertForm>
