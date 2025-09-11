<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import BtcSendTokenWizard from '$btc/components/send/BtcSendTokenWizard.svelte';
	import EthSendTokenWizard from '$eth/components/send/EthSendTokenWizard.svelte';
	import { selectedEthereumNetwork } from '$eth/derived/network.derived';
	import { ethereumToken } from '$eth/derived/token.derived';
	import type { EthereumNetwork } from '$eth/types/network';
	import { selectedEvmNetwork } from '$evm/derived/network.derived';
	import { evmNativeToken } from '$evm/derived/token.derived';
	import { enabledEvmTokens } from '$evm/derived/tokens.derived';
	import IcSendTokenWizard from '$icp/components/send/IcSendTokenWizard.svelte';
	import SendTokenContext from '$lib/components/send/SendTokenContext.svelte';
	import { DEFAULT_ETHEREUM_NETWORK } from '$lib/constants/networks.constants';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { Nft } from '$lib/types/nft';
	import type { Token } from '$lib/types/token';
	import {
		isNetworkIdEthereum,
		isNetworkIdICP,
		isNetworkIdBitcoin,
		isNetworkIdSolana,
		isNetworkIdEvm
	} from '$lib/utils/network.utils';
	import SolSendTokenWizard from '$sol/components/send/SolSendTokenWizard.svelte';

	export let destination: string;
	export let amount: number | undefined;
	export let sendProgressStep: string;
	export let currentStep: WizardStep | undefined;
	export let selectedContact: ContactUi | undefined = undefined;
	export let nft: Nft | undefined = undefined;

	const { sendToken } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let fallbackEvmToken: Token | undefined;
	$: fallbackEvmToken = $enabledEvmTokens.find(
		({ network: { id: networkId } }) => $sendToken.network.id === networkId
	);

	let evmNativeEthereumToken: Token | undefined;
	$: evmNativeEthereumToken = $evmNativeToken ?? fallbackEvmToken;
</script>

<SendTokenContext token={$sendToken}>
	{#if isNetworkIdEthereum($sendToken.network.id)}
		<EthSendTokenWizard
			{currentStep}
			{destination}
			nativeEthereumToken={$ethereumToken}
			{nft}
			{selectedContact}
			sourceNetwork={$selectedEthereumNetwork ?? DEFAULT_ETHEREUM_NETWORK}
			bind:amount
			bind:sendProgressStep
			on:icBack
			on:icSendBack
			on:icNext
			on:icClose
			on:icTokensList
		/>
	{:else if isNetworkIdEvm($sendToken.network.id) && nonNullish(evmNativeEthereumToken)}
		<EthSendTokenWizard
			{currentStep}
			{destination}
			nativeEthereumToken={evmNativeEthereumToken}
			{nft}
			{selectedContact}
			sourceNetwork={$selectedEvmNetwork ?? ($sendToken.network as EthereumNetwork)}
			bind:amount
			bind:sendProgressStep
			on:icBack
			on:icSendBack
			on:icNext
			on:icClose
			on:icTokensList
		/>
	{:else if isNetworkIdICP($sendToken.network.id)}
		<IcSendTokenWizard
			{currentStep}
			{destination}
			{selectedContact}
			bind:amount
			bind:sendProgressStep
			on:icSendBack
			on:icBack
			on:icNext
			on:icClose
			on:icTokensList
		/>
	{:else if isNetworkIdBitcoin($sendToken.network.id)}
		<BtcSendTokenWizard
			{currentStep}
			{destination}
			{selectedContact}
			bind:amount
			bind:sendProgressStep
			on:icBack
			on:icNext
			on:icClose
			on:icSendBack
			on:icTokensList
		/>
	{:else if isNetworkIdSolana($sendToken.network.id)}
		<SolSendTokenWizard
			{currentStep}
			{destination}
			{selectedContact}
			bind:amount
			bind:sendProgressStep
			on:icBack
			on:icNext
			on:icClose
			on:icSendBack
			on:icTokensList
		/>
	{:else}
		<slot />
	{/if}
</SendTokenContext>
