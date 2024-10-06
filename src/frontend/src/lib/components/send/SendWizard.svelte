<script lang="ts">
	import { type WizardStep } from '@dfinity/gix-components';
	import EthSendTokenWizard from '$eth/components/send/EthSendTokenWizard.svelte';
	import SendTokenContext from '$eth/components/send/SendTokenContext.svelte';
	import IcSendTokenWizard from '$icp/components/send/IcSendTokenWizard.svelte';
	import type { Network, NetworkId } from '$lib/types/network';
	import type { Token } from '$lib/types/token';
	import { isNetworkIdEthereum, isNetworkIdICP } from '$lib/utils/network.utils';

	export let token: Token;
	export let destination: string;
	export let targetNetwork: Network | undefined;
	export let networkId: NetworkId | undefined;
	export let amount: number | undefined;
	export let sendProgressStep: string;
	export let currentStep: WizardStep | undefined;
</script>

<SendTokenContext {token}>
	{#if isNetworkIdICP(token.network.id)}
		<IcSendTokenWizard
			{currentStep}
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
	{:else if isNetworkIdEthereum(token.network.id)}
		<EthSendTokenWizard
			{currentStep}
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
	{:else}
		<slot />
	{/if}
</SendTokenContext>
