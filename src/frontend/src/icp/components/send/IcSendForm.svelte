<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext } from 'svelte';
	import IcFeeDisplay from '$icp/components/send/IcFeeDisplay.svelte';
	import IcSendAmount from '$icp/components/send/IcSendAmount.svelte';
	import IcSendDestination from '$icp/components/send/IcSendDestination.svelte';
	import type { IcAmountAssertionError } from '$icp/types/ic-send';
	import SendSource from '$lib/components/send/SendSource.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ButtonNext from '$lib/components/ui/ButtonNext.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { balance } from '$lib/derived/balances.derived';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { NetworkId } from '$lib/types/network';
	import type { OptionAmount } from '$lib/types/send';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';

	export let destination = '';
	export let amount: OptionAmount = undefined;
	export let networkId: NetworkId | undefined = undefined;
	export let source: string;
	export let simplifiedForm = false;

	const { sendToken } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let amountError: IcAmountAssertionError | undefined;
	let invalidDestination: boolean;

	let invalid = true;
	$: invalid =
		invalidDestination ||
		nonNullish(amountError) ||
		isNullishOrEmpty(destination) ||
		isNullish(amount);

	const dispatch = createEventDispatcher();
</script>

<form on:submit={() => dispatch('icNext')} method="POST">
	<ContentWithToolbar>
		{#if !simplifiedForm}
			<IcSendDestination bind:destination bind:invalidDestination {networkId} on:icQRCodeScan />
		{/if}

		<IcSendAmount bind:amount bind:amountError {networkId} />

		<SendSource token={$sendToken} balance={$balance} {source} hideSource={simplifiedForm} />

		<IcFeeDisplay {networkId} />

		<ButtonGroup slot="toolbar" testId="toolbar">
			<slot name="cancel" />
			<ButtonNext disabled={invalid} />
		</ButtonGroup>
	</ContentWithToolbar>
</form>
