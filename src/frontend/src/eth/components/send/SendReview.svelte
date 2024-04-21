<script lang="ts">
	import { createEventDispatcher, getContext } from 'svelte';
	import { isNullish } from '@dfinity/utils';
	import { FEE_CONTEXT_KEY, type FeeContext } from '$eth/stores/fee.store';
	import SendData from '$lib/components/send/SendData.svelte';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';
	import { address } from '$lib/derived/address.derived';
	import FeeDisplay from '$eth/components/fee/FeeDisplay.svelte';
	import type { Network } from '$lib/types/network';
	import SendReviewNetwork from '$eth/components/send/SendReviewNetwork.svelte';
	import { isEthAddress } from '$lib/utils/account.utils';
	import { SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';
	import type { EthereumNetwork } from '$eth/types/network';
	import { i18n } from '$lib/stores/i18n.store';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';

	export let destination = '';
	export let targetNetwork: Network | undefined = undefined;
	export let sourceNetwork: EthereumNetwork;
	export let destinationEditable = true;
	export let amount: number | undefined = undefined;

	const { feeStore: storeFeeData }: FeeContext = getContext<FeeContext>(FEE_CONTEXT_KEY);

	let invalid = true;
	$: invalid =
		isNullishOrEmpty(destination) ||
		!isEthAddress(destination) ||
		invalidAmount(amount) ||
		isNullish($storeFeeData);

	const dispatch = createEventDispatcher();

	const { sendToken, sendBalance } = getContext<SendContext>(SEND_CONTEXT_KEY);
</script>

<SendData
	{amount}
	destination={destinationEditable ? destination : null}
	token={$sendToken}
	balance={$sendBalance}
	source={$address ?? ''}
>
	<FeeDisplay slot="fee" />

	<SendReviewNetwork {targetNetwork} {sourceNetwork} token={$sendToken} slot="network" />
</SendData>

<ButtonGroup>
	<button class="secondary block flex-1" on:click={() => dispatch('icBack')}
		>{$i18n.core.text.back}</button
	>
	<button
		class="primary block flex-1"
		disabled={invalid}
		class:opacity-10={invalid}
		on:click={() => dispatch('icSend')}
	>
		{$i18n.send.text.send}
	</button>
</ButtonGroup>
