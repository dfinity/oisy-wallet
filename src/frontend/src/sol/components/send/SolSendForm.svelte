<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import SendForm from '$lib/components/send/SendForm.svelte';
	import { balance } from '$lib/derived/balances.derived';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { type OptionAmount } from '$lib/types/send';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import SolFeeDisplay from '$sol/components/fee/SolFeeDisplay.svelte';
	import SolSendAmount from '$sol/components/send/SolSendAmount.svelte';
	import SolSendDestination from '$sol/components/send/SolSendDestination.svelte';
	import { type FeeContext, SOL_FEE_CONTEXT_KEY } from '$sol/stores/sol-fee.store';
	import type { SolAmountAssertionError } from '$sol/types/sol-send';

	export let amount: OptionAmount = undefined;
	export let destination = '';
	export let source: string;

	const { sendToken, sendTokenExchangeRate, sendTokenNetworkId, sendBalance, sendTokenStandard } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	const { feeStore: fee }: FeeContext = getContext<FeeContext>(SOL_FEE_CONTEXT_KEY);

	let amountError: SolAmountAssertionError | undefined;
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
	balance={$balance}
	disabled={invalid}
	hideSource
	networkId={$sendTokenNetworkId}
>
	<SolSendAmount slot="amount" bind:amount bind:amountError />

	<SolSendDestination slot="destination" bind:destination bind:invalidDestination on:icQRCodeScan />

	<SolFeeDisplay slot="fee" />

	<slot name="cancel" slot="cancel" />
</SendForm>
