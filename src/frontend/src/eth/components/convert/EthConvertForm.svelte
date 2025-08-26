<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import { getContext } from 'svelte';
	import { fade } from 'svelte/transition';
	import EthFeeDisplay from '$eth/components/fee/EthFeeDisplay.svelte';
	import { ETH_FEE_CONTEXT_KEY, type EthFeeContext } from '$eth/stores/eth-fee.store';
	import { isTokenErc20 } from '$eth/utils/erc20.utils';
	import ConvertForm from '$lib/components/convert/ConvertForm.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { ETH_CONVERT_FORM_TEST_ID } from '$lib/constants/test-ids.constants';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		TOKEN_ACTION_VALIDATION_ERRORS_CONTEXT_KEY,
		type TokenActionValidationErrorsContext
	} from '$lib/stores/token-action-validation-errors.store';
	import type { OptionAmount } from '$lib/types/send';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';

	export let sendAmount: OptionAmount;
	export let receiveAmount: number | undefined;
	export let destination = '';

	const { sourceToken } = getContext<ConvertContext>(CONVERT_CONTEXT_KEY);

	const { minGasFee, maxGasFee } = getContext<EthFeeContext>(ETH_FEE_CONTEXT_KEY);

	const { insufficientFunds, insufficientFundsForFee } =
		getContext<TokenActionValidationErrorsContext>(TOKEN_ACTION_VALIDATION_ERRORS_CONTEXT_KEY);

	let invalid: boolean;
	$: invalid =
		$insufficientFunds ||
		$insufficientFundsForFee ||
		invalidAmount(sendAmount) ||
		isNullishOrEmpty(destination);
</script>

<ConvertForm
	disabled={invalid}
	minFee={$minGasFee}
	testId={ETH_CONVERT_FORM_TEST_ID}
	totalFee={$maxGasFee}
	on:icNext
	bind:sendAmount
	bind:receiveAmount
>
	<svelte:fragment slot="message">
		{#if isTokenErc20($sourceToken) && $insufficientFundsForFee}
			<div in:fade>
				<MessageBox level="error"
					>{$i18n.send.assertion.insufficient_ethereum_funds_to_cover_the_fees}</MessageBox
				>
			</div>
		{/if}
	</svelte:fragment>

	<EthFeeDisplay slot="fee">
		{#snippet label()}
			<Html text={$i18n.fee.text.convert_fee} />
		{/snippet}
	</EthFeeDisplay>

	<slot name="cancel" slot="cancel" />
</ConvertForm>
