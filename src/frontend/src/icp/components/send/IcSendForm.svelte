<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import IcFeeDisplay from '$icp/components/send/IcFeeDisplay.svelte';
	import IcSendAmount from '$icp/components/send/IcSendAmount.svelte';
	import IcSendDestination from '$icp/components/send/IcSendDestination.svelte';
	import type { IcAmountAssertionError } from '$icp/types/ic-send';
	import SendForm from '$lib/components/send/SendForm.svelte';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { NetworkId } from '$lib/types/network';
	import type { OptionAmount } from '$lib/types/send';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';

	export let destination = '';
	export let amount: OptionAmount = undefined;
	export let networkId: NetworkId | undefined = undefined;
	export let source: string;
	export let simplifiedForm = false;

	const { sendToken, sendBalance } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let amountError: IcAmountAssertionError | undefined;
	let invalidDestination: boolean;

	let invalid = true;
	$: invalid =
		invalidDestination ||
		nonNullish(amountError) ||
		isNullishOrEmpty(destination) ||
		isNullish(amount);
</script>

<SendForm
	on:icNext
	{source}
	token={$sendToken}
	balance={$sendBalance}
	disabled={invalid}
	hideSource
>
	<IcSendAmount slot="amount" bind:amount bind:amountError {networkId} />

	<div slot="destination">
		{#if !simplifiedForm}
			<IcSendDestination bind:destination bind:invalidDestination {networkId} on:icQRCodeScan />
		{/if}
	</div>

	<IcFeeDisplay slot="fee" {networkId} />

	<slot name="cancel" slot="cancel" />
</SendForm>
