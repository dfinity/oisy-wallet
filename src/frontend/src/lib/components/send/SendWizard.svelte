<script lang="ts">
	import { type WizardStep } from '@dfinity/gix-components';
	import { selectedEthereumNetwork } from '$eth/derived/network.derived';
	import { ethereumToken } from '$eth/derived/token.derived';
	import EthSendTokenWizard from '$eth/components/send/EthSendTokenWizard.svelte';
	import type { Network, NetworkId } from '$lib/types/network';
	import { token } from '$lib/stores/token.store';
	import SendTokenContext from '$eth/components/send/SendTokenContext.svelte';
	import IcSendTokenWizard from '$icp/components/send/IcSendTokenWizard.svelte';
	import { isNetworkIdEthereum, isNetworkIdICP } from '$lib/utils/network.utils';

	export let destination: string;
	export let targetNetwork: Network | undefined;
	export let networkId: NetworkId | undefined;
	export let amount: number | undefined;
	export let sendProgressStep: string;
	export let currentStep: WizardStep | undefined;
</script>

{#if isNetworkIdEthereum($token?.network.id)}
	<!-- TODO: Move the context one level down -->
	<SendTokenContext token={$token}>
		<EthSendTokenWizard
			{currentStep}
			formCancelAction="back"
			sourceNetwork={$selectedEthereumNetwork}
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
	</SendTokenContext>
{:else if isNetworkIdICP($token?.network.id)}
	<IcSendTokenWizard
		{currentStep}
		formCancelAction="back"
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
{:else}
	<slot />
{/if}
