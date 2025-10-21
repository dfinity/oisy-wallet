<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type IcReceiveInfoCkBtc from '$icp/components/receive/IcReceiveInfoCkBtc.svelte';
	import type IcReceiveInfoIcp from '$icp/components/receive/IcReceiveInfoIcp.svelte';
	import type IcReceiveInfoIcrc from '$icp/components/receive/IcReceiveInfoIcrc.svelte';
	import ReceiveAddressQrCode from '$lib/components/receive/ReceiveAddressQrCode.svelte';
	import type ReceiveAddresses from '$lib/components/receive/ReceiveAddresses.svelte';
	import ReceiveTitle from '$lib/components/receive/ReceiveTitle.svelte';
	import { RECEIVE_TOKENS_MODAL } from '$lib/constants/test-ids.constants';
	import { WizardStepsReceiveAddress } from '$lib/enums/wizard-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ReceiveQRCode } from '$lib/types/receive';
	import type { Token } from '$lib/types/token';
	import { closeModal } from '$lib/utils/modal.utils';

	interface Props {
		infoCmp:
			| typeof ReceiveAddresses
			| typeof IcReceiveInfoCkBtc
			| typeof IcReceiveInfoIcp
			| typeof IcReceiveInfoIcrc;
		onClose?: () => void;
	}

	let { infoCmp: InfoCmp, onClose }: Props = $props();

	const steps: WizardSteps<WizardStepsReceiveAddress> = [
		{
			name: WizardStepsReceiveAddress.RECEIVE,
			title: $i18n.receive.text.receive
		},
		{
			name: WizardStepsReceiveAddress.QR_CODE,
			title: $i18n.receive.text.address
		}
	];

	let currentStep = $state<WizardStep<WizardStepsReceiveAddress> | undefined>();
	let modal = $state<WizardModal<WizardStepsReceiveAddress>>();

	let address = $state<undefined | string>();
	let addressLabel = $state<undefined | string>();
	let addressToken = $state<Token | undefined>();
	let copyAriaLabel = $state<string | undefined>();

	const displayQRCode = (detail: ReceiveQRCode) => {
		if (isNullish(modal)) {
			return;
		}

		({ address, addressLabel, addressToken, copyAriaLabel } = detail);

		modal.next();
	};

	const displayAddresses = () => {
		if (isNullish(modal)) {
			return;
		}

		modal.back();

		address = undefined;
		addressLabel = undefined;
		addressToken = undefined;
		copyAriaLabel = undefined;
	};
</script>

<WizardModal
	bind:this={modal}
	onClose={() => closeModal(() => onClose?.())}
	{steps}
	testId={RECEIVE_TOKENS_MODAL}
	bind:currentStep
>
	{#snippet title()}
		{#if currentStep?.name === steps[1].name}
			<ReceiveTitle title={addressToken?.network.name} />
		{:else}
			{$i18n.receive.text.receive}
		{/if}
	{/snippet}

	{#key currentStep?.name}
		{#if currentStep?.name === steps[1].name && nonNullish(addressToken)}
			<ReceiveAddressQrCode
				{address}
				{addressLabel}
				{addressToken}
				copyAriaLabel={copyAriaLabel ?? $i18n.wallet.text.wallet_address_copied}
				network={addressToken.network}
				onBack={displayAddresses}
			/>
		{:else}
			<InfoCmp onQRCode={displayQRCode} />
		{/if}
	{/key}
</WizardModal>
