<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import IcFeeDisplay from '$icp/components/send/IcFeeDisplay.svelte';
	import IcSendDestination from '$icp/components/send/IcSendDestination.svelte';
	import type { IcAmountAssertionError } from '$icp/types/ic-send';
	import SendForm from '$lib/components/send/SendForm.svelte';
	import SendMaxBalanceButton from '$lib/components/send/SendMaxBalanceButton.svelte';
	import TokenInput from '$lib/components/tokens/TokenInput.svelte';
	import TokenInputAmountExchange from '$lib/components/tokens/TokenInputAmountExchange.svelte';
	import { balance } from '$lib/derived/balances.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { ConvertAmountErrorType } from '$lib/types/convert';
	import type { NetworkId } from '$lib/types/network';
	import type { OptionAmount } from '$lib/types/send';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';

	export let destination = '';
	export let amount: OptionAmount = undefined;
	export let networkId: NetworkId | undefined = undefined;
	export let source: string;
	export let simplifiedForm = false;

	const { sendToken, sendBalance, sendTokenExchangeRate } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	let amountError: IcAmountAssertionError | undefined;
	let errorType: ConvertAmountErrorType = undefined;
	let invalidDestination: boolean;

	let invalid = true;
	$: invalid =
		invalidDestination ||
		nonNullish(errorType) ||
		nonNullish(amountError) ||
		isNullishOrEmpty(destination) ||
		isNullish(amount);
</script>

<SendForm
	on:icNext
	{source}
	token={$sendToken}
	balance={$balance}
	disabled={invalid}
	hideSource
>
	<div slot="amount">
		<TokenInput
			token={$sendToken}
			bind:amount
			isSelectable={false}
			exchangeRate={$sendTokenExchangeRate}
			bind:errorType
		>
			<span slot="title">{$i18n.core.text.amount}</span>

			<svelte:fragment slot="amount-info">
				{#if nonNullish($sendToken)}
					<div class="text-tertiary">
						<TokenInputAmountExchange
							{amount}
							exchangeRate={$sendTokenExchangeRate}
							token={$sendToken}
							disabled
						/>
					</div>
				{/if}
			</svelte:fragment>

			<svelte:fragment slot="balance">
				{#if nonNullish($sendToken)}
					<SendMaxBalanceButton bind:sendAmount={amount} {errorType} />
				{/if}
			</svelte:fragment>
		</TokenInput>
	</div>

	<div slot="destination">
		{#if !simplifiedForm}
			<IcSendDestination bind:destination bind:invalidDestination {networkId} on:icQRCodeScan />
		{/if}
	</div>

	<IcFeeDisplay slot="fee" {networkId} />

	<slot name="cancel" slot="cancel" />
</SendForm>
