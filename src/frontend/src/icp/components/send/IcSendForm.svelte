<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import IcTokenFee from '$icp/components/fee/IcTokenFee.svelte';
	import IcSendAmount from '$icp/components/send/IcSendAmount.svelte';
	import type { IcAmountAssertionError } from '$icp/types/ic-send';
	import { isInvalidDestinationIc } from '$icp/utils/ic-send.utils';
	import SendForm from '$lib/components/send/SendForm.svelte';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { NetworkId } from '$lib/types/network';
	import type { OptionAmount } from '$lib/types/send';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';

	export let destination = '';
	export let amount: OptionAmount = undefined;
	export let networkId: NetworkId | undefined = undefined;
	export let source: string;

	const { sendToken, sendBalance, sendTokenStandard } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let amountError: IcAmountAssertionError | undefined;

	let invalidDestination = false;
	$: invalidDestination =
		isNullishOrEmpty(destination) ||
		isInvalidDestinationIc({
			destination,
			tokenStandard: $sendTokenStandard,
			networkId
		});

	let invalid = true;
	$: invalid = invalidDestination || nonNullish(amountError) || isNullish(amount);
</script>

<SendForm
	on:icNext
	on:icBack
	{source}
	{destination}
	{invalidDestination}
	token={$sendToken}
	balance={$sendBalance}
	disabled={invalid}
	hideSource
>
	<IcSendAmount slot="amount" bind:amount bind:amountError {networkId} on:icTokensList />

	<IcTokenFee slot="fee" />

	<slot name="cancel" slot="cancel" />
</SendForm>
