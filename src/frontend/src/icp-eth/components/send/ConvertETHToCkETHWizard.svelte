<script lang="ts">
	import type { WizardStep, WizardSteps } from '@dfinity/gix-components';
	import { ETHEREUM_NETWORK } from '$env/networks.env';
	import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
	import EthSendTokenWizard from '$eth/components/send/EthSendTokenWizard.svelte';
	import { howToConvertWizardSteps } from '$icp-eth/config/how-to-convert.config';
	import {
		ckEthereumNativeToken,
		ckEthereumTwinToken,
		ckEthereumTwinTokenNetwork
	} from '$icp-eth/derived/cketh.derived';
	import ReceiveAddressQRCode from '$lib/components/receive/ReceiveAddressQRCode.svelte';
	import { ethAddress } from '$lib/derived/address.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Network } from '$lib/types/network';
	import type { OptionAmount } from '$lib/types/send';

	export let destination = '';
	export let targetNetwork: Network | undefined = undefined;
	export let amount: OptionAmount = undefined;
	export let sendProgressStep: string;
	export let currentStep: WizardStep | undefined;

	let steps: WizardSteps;
	$: steps = howToConvertWizardSteps({ i18n: $i18n, twinToken: $ckEthereumTwinToken });

	// TODO: ETH or Sepolia for addressToken
</script>

<EthSendTokenWizard
	{currentStep}
	sourceNetwork={$ckEthereumTwinTokenNetwork}
	nativeEthereumToken={$ckEthereumNativeToken}
	bind:destination
	bind:targetNetwork
	bind:amount
	bind:sendProgressStep
	on:icBack
	on:icNext
	on:icClose
	on:icSendBack
	formCancelAction="back"
>
	{#if currentStep?.name === steps[1].name}
		<ReceiveAddressQRCode
			address={$ethAddress ?? ''}
			addressToken={ETHEREUM_TOKEN}
			network={ETHEREUM_NETWORK}
			qrCodeAction={{
				enabled: true,
				ariaLabel: $i18n.receive.ethereum.text.display_ethereum_address_qr
			}}
			copyAriaLabel={$i18n.receive.ethereum.text.ethereum_address_copied}
			on:icBack
		/>
	{:else}
		<slot />
	{/if}
</EthSendTokenWizard>
