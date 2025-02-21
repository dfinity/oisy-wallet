<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, onMount } from 'svelte';
	import BtcSendDestination from '$btc/components/send/BtcSendDestination.svelte';
	import { loadBtcPendingSentTransactions } from '$btc/services/btc-pending-sent-transactions.services';
	import type { BtcAmountAssertionError } from '$btc/types/btc-send';
	import SendForm from '$lib/components/send/SendForm.svelte';
	import SendMaxBalanceButton from '$lib/components/send/SendMaxBalanceButton.svelte';
	import TokenInput from '$lib/components/tokens/TokenInput.svelte';
	import TokenInputAmountExchange from '$lib/components/tokens/TokenInputAmountExchange.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { balance } from '$lib/derived/balances.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { ConvertAmountErrorType } from '$lib/types/convert';
	import type { NetworkId } from '$lib/types/network';
	import type { OptionAmount } from '$lib/types/send';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';

	export let networkId: NetworkId | undefined = undefined;
	export let amount: OptionAmount = undefined;
	export let destination = '';
	export let source: string;

	let amountError: BtcAmountAssertionError | undefined;
	let errorType: ConvertAmountErrorType = undefined;
	let invalidDestination: boolean;

	const { sendToken, sendTokenExchangeRate, sendTokenNetworkId } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	// TODO: check if we can align this validation flag with other SendForm components (e.g IcSendForm)
	let invalid = true;
	$: invalid =
		invalidDestination ||
		nonNullish(errorType) ||
		nonNullish(amountError) ||
		isNullishOrEmpty(destination) ||
		isNullish(amount);

	onMount(() => {
		// This call will load the pending sent transactions for the source address in the store.
		// This data will then be used in the review step. That's why we don't wait here.
		loadBtcPendingSentTransactions({
			identity: $authIdentity,
			networkId,
			address: source
		});
	});
</script>

<SendForm
	on:icNext
	{source}
	token={$sendToken}
	balance={$balance}
	disabled={invalid}
	hideSource
	networkId={$sendTokenNetworkId}
>
	<BtcSendDestination
		slot="destination"
		bind:destination
		bind:invalidDestination
		{networkId}
		on:icQRCodeScan
	/>

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

	<!--	TODO: calculate and display transaction fee	-->

	<slot name="cancel" slot="cancel" />
</SendForm>
