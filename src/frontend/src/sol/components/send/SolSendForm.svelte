<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import SendForm from '$lib/components/send/SendForm.svelte';
	import { balance } from '$lib/derived/balances.derived';
	import { token } from '$lib/stores/token.store';
	import type { OptionAmount } from '$lib/types/send';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import SolFeeDisplay from '$sol/components/fee/SolFeeDisplay.svelte';
	import SolSendAmount from '$sol/components/send/SolSendAmount.svelte';
	import SolSendDestination from '$sol/components/send/SolSendDestination.svelte';
	import type { SolAmountAssertionError } from '$sol/types/sol-send';
	import {SEND_CONTEXT_KEY, type SendContext} from "$lib/stores/send.store";
	import {getContext} from "svelte";

	export let amount: OptionAmount = undefined;
	export let destination = '';
	export let source: string;

	const { sendTokenNetworkId } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let amountError: SolAmountAssertionError | undefined;
	let invalidDestination: boolean;

	let invalid = true;
	$: invalid =
		invalidDestination ||
		nonNullish(amountError) ||
		isNullishOrEmpty(destination) ||
		isNullish(amount);
</script>

<SendForm on:icNext {source} token={$token} balance={$balance} disabled={invalid} networkId={$sendTokenNetworkId}>
	<SolSendDestination slot="destination" bind:destination bind:invalidDestination on:icQRCodeScan />

	<SolSendAmount slot="amount" bind:amount bind:amountError />

	<SolFeeDisplay slot="fee" />

	<slot name="cancel" slot="cancel" />
</SendForm>
