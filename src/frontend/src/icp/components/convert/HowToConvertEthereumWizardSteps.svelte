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
		currentStep?: WizardStep;
		formCancelAction?: 'back' | 'close';
		onBack: () => void;
		onConvert: () => void;
		onQrCode: () => void;
	}

	let { currentStep, formCancelAction = 'close', onBack, onConvert, onQrCode }: Props = $props();
</script>

{#key currentStep?.name}
	{#if currentStep?.name === WizardStepsHowToConvert.INFO}
		<HowToConvertEthereumInfo {formCancelAction} {onBack} {onConvert} {onQrCode} />
	{:else if currentStep?.name === WizardStepsHowToConvert.ETH_QR_CODE}
		<ReceiveAddressQrCode
			address={$ethAddress ?? ''}
			addressToken={ETHEREUM_TOKEN}
			copyAriaLabel={$i18n.receive.ethereum.text.ethereum_address_copied}
			network={ETHEREUM_NETWORK}
			{onBack}
			testId={HOW_TO_CONVERT_ETHEREUM_QR_CODE}
		/>
	{/if}
{/key}
