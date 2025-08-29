<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
	import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
	import HowToConvertEthereumInfo from '$icp/components/convert/HowToConvertEthereumInfo.svelte';
	import ReceiveAddressQrCode from '$lib/components/receive/ReceiveAddressQrCode.svelte';
	import { HOW_TO_CONVERT_ETHEREUM_QR_CODE } from '$lib/constants/test-ids.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { WizardStepsHowToConvert } from '$lib/enums/wizard-steps';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		currentStep: WizardStep | undefined;
		formCancelAction?: 'back' | 'close';
	}

	let { currentStep, formCancelAction = 'close' }: Props = $props();
</script>

{#if currentStep?.name === WizardStepsHowToConvert.INFO}
	<HowToConvertEthereumInfo {formCancelAction} on:icQRCode on:icConvert on:icBack />
{:else if currentStep?.name === WizardStepsHowToConvert.ETH_QR_CODE}
	<ReceiveAddressQrCode
		address={$ethAddress ?? ''}
		addressToken={ETHEREUM_TOKEN}
		copyAriaLabel={$i18n.receive.ethereum.text.ethereum_address_copied}
		network={ETHEREUM_NETWORK}
		qrCodeAction={{
			enabled: true,
			ariaLabel: $i18n.receive.ethereum.text.display_ethereum_address_qr
		}}
		testId={HOW_TO_CONVERT_ETHEREUM_QR_CODE}
		on:icBack
	/>
{/if}
