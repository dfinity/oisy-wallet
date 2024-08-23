<script lang="ts">
	import SendSource from '$lib/components/send/SendSource.svelte';
	import { createEventDispatcher, getContext } from 'svelte';
	import FeeDisplay from '$eth/components/fee/FeeDisplay.svelte';
	import SendNetworkICP from './SendNetworkICP.svelte';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { ethAddress } from '$lib/derived/address.derived';
	import type { Network } from '$lib/types/network';
	import SendAmount from '$eth/components/send/SendAmount.svelte';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import SendDestination from '$eth/components/send/SendDestination.svelte';
	import { SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';
	import { i18n } from '$lib/stores/i18n.store';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import type { EthereumNetwork } from '$eth/types/network';
	import type { Token } from '$lib/types/token';
	import Warning from '$lib/components/ui/Warning.svelte';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import type { Erc20Token } from '$eth/types/erc20';

	export let destination = '';
	export let network: Network | undefined = undefined;
	export let destinationEditable = true;
	export let amount: number | undefined = undefined;
	export let nativeEthereumToken: Token;
	// TODO: to be removed once minterInfo breaking changes have been executed on mainnet
	export let sourceNetwork: EthereumNetwork;

	let insufficientFunds: boolean;
	let invalidDestination: boolean;

	let invalid = true;
	$: invalid =
		invalidDestination || insufficientFunds || isNullishOrEmpty(destination) || isNullish(amount);

	const dispatch = createEventDispatcher();

	const { sendToken, sendBalance, sendPurpose } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let info: string | undefined = undefined;
	$: info =
		sendPurpose === 'convert-eth-to-cketh'
			? $i18n.convert.text.cketh_conversions_may_take
			: sendPurpose === 'convert-erc20-to-ckerc20'
				? replacePlaceholders($i18n.convert.text.ckerc20_conversions_may_take, {
						$ckErc20: ($sendToken as Erc20Token).twinTokenSymbol ?? 'ckETH'
					})
				: undefined;
</script>

<form on:submit={() => dispatch('icNext')} method="POST">
	<div class="stretch">
		{#if destinationEditable}
			<SendDestination
				token={$sendToken}
				{network}
				bind:destination
				bind:invalidDestination
				on:icQRCodeScan
			/>

			<SendNetworkICP {destination} {sourceNetwork} bind:network />
		{/if}

		<SendAmount {nativeEthereumToken} bind:amount bind:insufficientFunds />

		<SendSource token={$sendToken} balance={$sendBalance} source={$ethAddress ?? ''} />

		<FeeDisplay />

		{#if nonNullish(info)}
			<Warning info><p>{info}</p></Warning>
		{/if}
	</div>

	<ButtonGroup>
		<slot name="cancel" />
		<button
			class="primary block flex-1"
			type="submit"
			disabled={invalid}
			class:opacity-10={invalid}
		>
			{$i18n.core.text.next}
		</button>
	</ButtonGroup>
</form>
