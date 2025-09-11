<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import { setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import EthSendTokenWizard from '$eth/components/send/EthSendTokenWizard.svelte';
	import type { EthereumNetwork } from '$eth/types/network';
	import { SEND_CONTEXT_KEY } from '$lib/stores/send.store';
	import type { Nft, NonFungibleToken } from '$lib/types/nft';
	import type { Token } from '$lib/types/token';

	export let currentStep: WizardStep | undefined;
	export let nft: Nft | undefined;
	export let destination: string;
	export let sourceNetwork: EthereumNetwork;
	export let amount: number | string | undefined = 1;
	export let sendProgressStep = '';
	export let nativeEthereumToken: Token;

	export let sendToken: Token | NonFungibleToken;
	export let sendTokenId: string;
	export let sendTokenDecimals: number;

	const sendTokenStore = writable(sendToken);
	const sendTokenIdStore = writable(sendTokenId);
	const sendTokenDecimalsStore = writable(sendTokenDecimals);

	setContext(SEND_CONTEXT_KEY, {
		sendToken: sendTokenStore,
		sendTokenId: sendTokenIdStore,
		sendTokenDecimals: sendTokenDecimalsStore
	});
</script>

<EthSendTokenWizard
	{amount}
	{currentStep}
	{destination}
	{nativeEthereumToken}
	{nft}
	{sendProgressStep}
	{sourceNetwork}
/>
