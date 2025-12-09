<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import BtcSendTokenWizard from '$btc/components/send/BtcSendTokenWizard.svelte';
	import EthSendTokenWizard from '$eth/components/send/EthSendTokenWizard.svelte';
	import { selectedEthereumNetwork } from '$eth/derived/network.derived';
	import { nativeEthereumTokenWithFallback } from '$eth/derived/token.derived';
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
	import {
		isNetworkIdEthereum,
		isNetworkIdICP,
		isNetworkIdBitcoin,
		isNetworkIdSolana,
		isNetworkIdEvm
	} from '$lib/utils/network.utils';
	import SolSendTokenWizard from '$sol/components/send/SolSendTokenWizard.svelte';

	interface Props {
		destination: string;
		amount?: number;
		sendProgressStep: string;
		currentStep?: WizardStep;
		selectedContact?: ContactUi;
		nft?: Nft;
		onBack: () => void;
		onClose: () => void;
		onNext: () => void;
		onSendBack: () => void;
		onTokensList: () => void;
	}

	let {
		destination,
		amount = $bindable(),
		sendProgressStep = $bindable(),
		currentStep,
		selectedContact,
		nft,
		onBack,
		onClose,
		onNext,
		onSendBack,
		onTokensList
	}: Props = $props();

	const { sendToken } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let fallbackEvmToken = $derived(
		$enabledEvmTokens.find(({ network: { id: networkId } }) => $sendToken.network.id === networkId)
	);

	let evmNativeEthereumToken = $derived($evmNativeToken ?? fallbackEvmToken);
</script>

<SendTokenContext token={$sendToken}>
	{#if isNetworkIdEthereum($sendToken.network.id)}
		<EthSendTokenWizard
			{currentStep}
			{destination}
			nativeEthereumToken={$nativeEthereumTokenWithFallback}
			{nft}
			{onBack}
			{onClose}
			{onNext}
			{onSendBack}
			{onTokensList}
			{selectedContact}
			sourceNetwork={$selectedEthereumNetwork ?? DEFAULT_ETHEREUM_NETWORK}
			bind:amount
			bind:sendProgressStep
		/>
	{:else if isNetworkIdEvm($sendToken.network.id) && nonNullish(evmNativeEthereumToken)}
		<EthSendTokenWizard
			{currentStep}
			{destination}
			nativeEthereumToken={evmNativeEthereumToken}
			{nft}
			{onBack}
			{onClose}
			{onNext}
			{onSendBack}
			{onTokensList}
			{selectedContact}
			sourceNetwork={$selectedEvmNetwork ?? ($sendToken.network as EthereumNetwork)}
			bind:amount
			bind:sendProgressStep
		/>
	{:else if isNetworkIdICP($sendToken.network.id)}
		<IcSendTokenWizard
			{currentStep}
			{destination}
			{nft}
			{onBack}
			{onClose}
			{onNext}
			{onSendBack}
			{onTokensList}
			{selectedContact}
			bind:amount
			bind:sendProgressStep
		/>
	{:else if isNetworkIdBitcoin($sendToken.network.id)}
		<BtcSendTokenWizard
			{currentStep}
			{destination}
			{onBack}
			{onClose}
			{onNext}
			{onSendBack}
			{onTokensList}
			{selectedContact}
			bind:amount
			bind:sendProgressStep
		/>
	{:else if isNetworkIdSolana($sendToken.network.id)}
		<SolSendTokenWizard
			{currentStep}
			{destination}
			{onBack}
			{onClose}
			{onNext}
			{onSendBack}
			{onTokensList}
			{selectedContact}
			bind:amount
			bind:sendProgressStep
		/>
	{/if}
</SendTokenContext>
