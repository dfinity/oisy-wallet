<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import UtxosFeeContexts from '$btc/components/fee/UtxosFeeContexts.svelte';
	import BtcSendTokenWizard from '$btc/components/send/BtcSendTokenWizard.svelte';
	import EthSendTokenWizard from '$eth/components/send/EthSendTokenWizard.svelte';
	import { selectedEthereumNetwork } from '$eth/derived/network.derived';
	import { nativeEthereumTokenWithFallback } from '$eth/derived/token.derived';
	import { selectedEvmNetwork } from '$evm/derived/network.derived';
	import { evmNativeToken } from '$evm/derived/token.derived';
	import { enabledEvmTokens } from '$evm/derived/tokens.derived';
	import IcSendTokenWizard from '$icp/components/send/IcSendTokenWizard.svelte';
	import { DEFAULT_ETHEREUM_NETWORK } from '$lib/constants/networks.constants';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { Nft } from '$lib/types/nft';
	import {
		isNetworkIdEthereum,
		isNetworkIdICP,
		isNetworkIdBitcoin,
		isNetworkIdKaspa,
		isNetworkIdSolana,
		isNetworkIdEvm,
		isNetworkEthereum
	} from '$lib/utils/network.utils';
	import SolSendTokenWizard from '$sol/components/send/SolSendTokenWizard.svelte';
	import KaspaSendTokenWizard from '$kaspa/components/send/KaspaSendTokenWizard.svelte';

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
{:else if isNetworkIdEvm($sendToken.network.id) && nonNullish(evmNativeEthereumToken) && isNetworkEthereum($sendToken.network)}
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
		sourceNetwork={$selectedEvmNetwork ?? $sendToken.network}
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
	<UtxosFeeContexts>
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
	</UtxosFeeContexts>
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
{:else if isNetworkIdKaspa($sendToken.network.id)}
	<KaspaSendTokenWizard
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
