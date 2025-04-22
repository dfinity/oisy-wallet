<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import FeeDisplay from '$eth/components/fee/FeeDisplay.svelte';
	import EthSendAmount from '$eth/components/send/EthSendAmount.svelte';
	import EthSendDestination from '$eth/components/send/EthSendDestination.svelte';
	import SendInfo from '$eth/components/send/SendInfo.svelte';
	import SendForm from '$lib/components/send/SendForm.svelte';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { Network } from '$lib/types/network';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';

	export let destination = '';
	export let network: Network | undefined = undefined;
	export let amount: OptionAmount = undefined;
	export let nativeEthereumToken: Token;

	let insufficientFunds: boolean;
	let invalidDestination: boolean;

	let invalid = true;
	$: invalid =
		invalidDestination || insufficientFunds || isNullishOrEmpty(destination) || isNullish(amount);

	const { sendToken, sendBalance } = getContext<SendContext>(SEND_CONTEXT_KEY);
</script>

<SendForm on:icNext token={$sendToken} balance={$sendBalance} disabled={invalid} hideSource>
	<EthSendAmount slot="amount" {nativeEthereumToken} bind:amount bind:insufficientFunds />

	<EthSendDestination
		slot="destination"
		token={$sendToken}
		{network}
		bind:destination
		bind:invalidDestination
		on:icQRCodeScan
	/>

	<FeeDisplay slot="fee" />

	<SendInfo slot="info" />

	<slot name="cancel" slot="cancel" />
</SendForm>
