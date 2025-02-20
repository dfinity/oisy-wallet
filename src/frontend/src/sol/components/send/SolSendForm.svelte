<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import SendForm from '$lib/components/send/SendForm.svelte';
	import SendMaxBalanceButton from '$lib/components/send/SendMaxBalanceButton.svelte';
	import TokenInput from '$lib/components/tokens/TokenInput.svelte';
	import TokenInputAmountExchange from '$lib/components/tokens/TokenInputAmountExchange.svelte';
	import { balance } from '$lib/derived/balances.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { token } from '$lib/stores/token.store';
	import type { ConvertAmountErrorType } from '$lib/types/convert';
	import type { OptionAmount } from '$lib/types/send';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import SolFeeDisplay from '$sol/components/fee/SolFeeDisplay.svelte';
	import SolSendDestination from '$sol/components/send/SolSendDestination.svelte';
	import type { SolAmountAssertionError } from '$sol/types/sol-send';

	export let amount: OptionAmount = undefined;
	export let destination = '';
	export let source: string;

	const { sendToken, sendTokenExchangeRate, sendTokenNetworkId } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	let amountError: SolAmountAssertionError | undefined;
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
	token={$token}
	balance={$balance}
	disabled={invalid}
	hideSource
	networkId={$sendTokenNetworkId}
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

	<SolSendDestination slot="destination" bind:destination bind:invalidDestination on:icQRCodeScan />

	<SolFeeDisplay slot="fee" />

	<slot name="cancel" slot="cancel" />
</SendForm>
