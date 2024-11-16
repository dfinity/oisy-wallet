<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext } from 'svelte';
	import FeeDisplay from '$eth/components/fee/FeeDisplay.svelte';
	import SendInfo from '$eth/components/send/SendInfo.svelte';
	import SendReviewNetwork from '$eth/components/send/SendReviewNetwork.svelte';
	import { FEE_CONTEXT_KEY, type FeeContext } from '$eth/stores/fee.store';
	import type { EthereumNetwork } from '$eth/types/network';
	import SendData from '$lib/components/send/SendData.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { ethAddress } from '$lib/derived/address.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { Network } from '$lib/types/network';
	import { isEthAddress } from '$lib/utils/account.utils';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';

	export let destination = '';
	export let targetNetwork: Network | undefined = undefined;
	export let sourceNetwork: EthereumNetwork;
	export let destinationEditable = true;
	export let amount: string | number | undefined = undefined;

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

<ContentWithToolbar>
	<SendData
		{amount}
		destination={destinationEditable ? destination : null}
		token={$sendToken}
		balance={$sendBalance}
		source={$ethAddress ?? ''}
	>
		<FeeDisplay slot="fee" />

		<SendReviewNetwork {targetNetwork} {sourceNetwork} token={$sendToken} slot="network" />
	</SendData>

	<SendInfo />

	<ButtonGroup slot="toolbar">
		<ButtonBack on:click={() => dispatch('icBack')} />
		<Button disabled={invalid} on:click={() => dispatch('icSend')}>
			{$i18n.send.text.send}
		</Button>
	</ButtonGroup>
</ContentWithToolbar>
