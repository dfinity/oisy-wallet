<script lang="ts">
	import { type WizardStep } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import BtcSendTokenWizard from '$btc/components/send/BtcSendTokenWizard.svelte';
	import EthSendTokenWizard from '$eth/components/send/EthSendTokenWizard.svelte';
	import { selectedEthereumNetworkWithFallback } from '$eth/derived/network.derived';
	import { ethereumToken } from '$eth/derived/token.derived';
	import { selectedEvmNetwork } from '$evm/derived/network.derived';
	import { evmNativeToken } from '$evm/derived/token.derived';
	import IcSendTokenWizard from '$icp/components/send/IcSendTokenWizard.svelte';
	import SendTokenContext from '$lib/components/send/SendTokenContext.svelte';
	import { token } from '$lib/stores/token.store';
	import type { Network, NetworkId } from '$lib/types/network';
	import {
		isNetworkIdEthereum,
		isNetworkIdICP,
		isNetworkIdBitcoin,
		isNetworkIdSolana,
		isNetworkIdEvm
	} from '$lib/utils/network.utils';
	import SolSendTokenWizard from '$sol/components/send/SolSendTokenWizard.svelte';

	export let source: string;
	export let destination: string;
	export let targetNetwork: Network | undefined;
	export let networkId: NetworkId | undefined;
	export let amount: number | undefined;
	export let sendProgressStep: string;
	export let currentStep: WizardStep | undefined;
	export let formCancelAction: 'back' | 'close' = 'back';
</script>

<SendTokenContext token={$token}>
	{#if isNetworkIdEthereum($token?.network.id)}
		<EthSendTokenWizard
			{currentStep}
			{formCancelAction}
			sourceNetwork={$selectedEthereumNetworkWithFallback}
			nativeEthereumToken={$ethereumToken}
			bind:destination
			bind:targetNetwork
			bind:amount
			bind:sendProgressStep
			on:icBack
			on:icSendBack
			on:icNext
			on:icClose
			on:icQRCodeScan
			on:icQRCodeBack
		/>
	{:else if isNetworkIdEvm($token?.network.id) && nonNullish($selectedEvmNetwork) && nonNullish($evmNativeToken)}
		<!--			TODO: use store evmNativeToken here when we adapt the fee context to fetch the EVM fees -->
		<EthSendTokenWizard
			{currentStep}
			{formCancelAction}
			sourceNetwork={$selectedEvmNetwork}
			nativeEthereumToken={$ethereumToken}
			bind:destination
			bind:targetNetwork
			bind:amount
			bind:sendProgressStep
			on:icBack
			on:icSendBack
			on:icNext
			on:icClose
			on:icQRCodeScan
			on:icQRCodeBack
		/>
	{:else if isNetworkIdICP($token?.network.id)}
		<IcSendTokenWizard
			{source}
			{currentStep}
			{formCancelAction}
			bind:destination
			bind:networkId
			bind:amount
			bind:sendProgressStep
			on:icSendBack
			on:icBack
			on:icNext
			on:icClose
			on:icQRCodeScan
			on:icQRCodeBack
		/>
	{:else if isNetworkIdBitcoin($token?.network.id)}
		<BtcSendTokenWizard
			{currentStep}
			{formCancelAction}
			bind:destination
			bind:amount
			bind:sendProgressStep
			on:icBack
			on:icNext
			on:icClose
			on:icSendBack
			on:icQRCodeScan
			on:icQRCodeBack
		/>
	{:else if isNetworkIdSolana($token?.network.id)}
		<SolSendTokenWizard
			{currentStep}
			{formCancelAction}
			bind:destination
			bind:amount
			bind:sendProgressStep
			on:icBack
			on:icNext
			on:icClose
			on:icSendBack
			on:icQRCodeScan
			on:icQRCodeBack
		/>
	{:else}
		<slot />
	{/if}
</SendTokenContext>
