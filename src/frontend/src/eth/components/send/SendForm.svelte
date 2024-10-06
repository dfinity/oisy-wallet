<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import FeeDisplay from '$eth/components/fee/FeeDisplay.svelte';
	import SendAmount from '$eth/components/send/SendAmount.svelte';
	import SendDestination from '$eth/components/send/SendDestination.svelte';
	import SendInfo from '$eth/components/send/SendInfo.svelte';
	import SendNetworkICP from '$eth/components/send/SendNetworkICP.svelte';
	import type { EthereumNetwork } from '$eth/types/network';
	import SendSource from '$lib/components/send/SendSource.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { ethAddress } from '$lib/derived/address.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionBalance } from '$lib/types/balance';
	import type { Network } from '$lib/types/network';
	import type { Token } from '$lib/types/token';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';

	export let token: Token;
	export let balance: OptionBalance;
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
</script>

<form on:submit={() => dispatch('icNext')} method="POST">
	<ContentWithToolbar>
		{#if destinationEditable}
			<SendDestination {token} {network} bind:destination bind:invalidDestination on:icQRCodeScan />

			<SendNetworkICP {token} {destination} {sourceNetwork} bind:network />
		{/if}

		<SendAmount {token} {balance} {nativeEthereumToken} bind:amount bind:insufficientFunds />

		<SendSource {token} {balance} source={$ethAddress ?? ''} />

		<FeeDisplay />

		<SendInfo {token} />

		<ButtonGroup slot="toolbar">
			<slot name="cancel" />
			<Button disabled={invalid}>
				{$i18n.core.text.next}
			</Button>
		</ButtonGroup>
	</ContentWithToolbar>
</form>
