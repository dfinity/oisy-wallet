<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext } from 'svelte';
	import FeeDisplay from '$eth/components/fee/FeeDisplay.svelte';
	import EthSendAmount from '$eth/components/send/EthSendAmount.svelte';
	import EthSendDestination from '$eth/components/send/EthSendDestination.svelte';
	import SendInfo from '$eth/components/send/SendInfo.svelte';
	import SendNetworkICP from '$eth/components/send/SendNetworkICP.svelte';
	import type { EthereumNetwork } from '$eth/types/network';
	import NetworkInfo from '$lib/components/networks/NetworkInfo.svelte';
	import SendSource from '$lib/components/send/SendSource.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ButtonNext from '$lib/components/ui/ButtonNext.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { ethAddress } from '$lib/derived/address.derived';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { Network } from '$lib/types/network';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';

	export let destination = '';
	export let network: Network | undefined = undefined;
	export let destinationEditable = true;
	export let amount: OptionAmount = undefined;
	export let nativeEthereumToken: Token;
	// TODO: to be removed once minterInfo breaking changes have been executed on mainnet
	export let sourceNetwork: EthereumNetwork;

	let insufficientFunds: boolean;
	let invalidDestination: boolean;

	let invalid = true;
	$: invalid =
		invalidDestination || insufficientFunds || isNullishOrEmpty(destination) || isNullish(amount);

	const dispatch = createEventDispatcher();

	const { sendToken, sendBalance } = getContext<SendContext>(SEND_CONTEXT_KEY);
</script>

<form on:submit={() => dispatch('icNext')} method="POST">
	<ContentWithToolbar>
		{#if destinationEditable}
			<EthSendDestination
				token={$sendToken}
				{network}
				bind:destination
				bind:invalidDestination
				on:icQRCodeScan
			/>

			<SendNetworkICP {destination} {sourceNetwork} bind:network />
		{/if}

		<EthSendAmount {nativeEthereumToken} bind:amount bind:insufficientFunds />

		<SendSource token={$sendToken} balance={$sendBalance} source={$ethAddress ?? ''} />

		<NetworkInfo network={sourceNetwork} />

		<FeeDisplay />

		<SendInfo />

		<ButtonGroup slot="toolbar" testId="toolbar">
			<slot name="cancel" />
			<ButtonNext disabled={invalid} />
		</ButtonGroup>
	</ContentWithToolbar>
</form>
