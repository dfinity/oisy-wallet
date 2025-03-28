<script lang="ts">
	import { type WizardStep } from '@dfinity/gix-components';
	import BtcSendTokenWizard from '$btc/components/send/BtcSendTokenWizard.svelte';
	import EthSendTokenWizard from '$eth/components/send/EthSendTokenWizard.svelte';
	import { selectedEthereumNetworkWithFallback } from '$eth/derived/network.derived';
	import { ethereumToken } from '$eth/derived/token.derived';
	import IcSendTokenWizard from '$icp/components/send/IcSendTokenWizard.svelte';
	import SendTokenContext from '$lib/components/send/SendTokenContext.svelte';
	import { token } from '$lib/stores/token.store';
	import type { Network, NetworkId } from '$lib/types/network';
	import {
		isNetworkIdEthereum,
		isNetworkIdICP,
		isNetworkIdBitcoin,
		isNetworkIdSolana
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
	{:else if isNetworkIdICP($token?.network.id)}
		<IcSendTokenWizard
			{source}
			{currentStep}
			{formCancelAction}
			bind:destination
			bind:networkId
			bind:amount
			bind:sendProgressStep
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
