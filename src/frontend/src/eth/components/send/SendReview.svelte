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

	{#if destinationEditable}
		<SendReviewNetwork {targetNetwork} {sourceNetwork} slot="network" />
	{/if}
</SendData>

<div class="flex justify-end gap-1">
	<button class="secondary" on:click={() => dispatch('icBack')}>Back</button>
	<button
		class="primary"
		disabled={invalid}
		class:opacity-10={invalid}
		on:click={() => dispatch('icSend')}
	>
		Send
	</button>
</div>
