<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import type { ComponentType } from 'svelte';
	import ReceiveAddressQRCode from '$lib/components/receive/ReceiveAddressQRCode.svelte';
	import { RECEIVE_TOKENS_MODAL } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ReceiveQRCode } from '$lib/types/receive';
	import type { Token } from '$lib/types/token';

	export let infoCmp: ComponentType;

	const steps: WizardSteps = [
		{
			name: 'Receive',
			title: $i18n.receive.text.receive
		},
		{
			name: 'QR code',
			title: $i18n.receive.text.address
		}
	];

	let currentStep: WizardStep | undefined;
	let modal: WizardModal;

	let qrCodeAddress: undefined | string;
	let qrCodeAddressLabel: undefined | string;
	let qrCodeAddressToken: Token | undefined;

	const displayQRCode = ({
		detail: { address, addressLabel, addressToken }
	}: CustomEvent<ReceiveQRCode>) => {
		qrCodeAddress = address;
		qrCodeAddressLabel = addressLabel;
		qrCodeAddressToken = addressToken;
		modal.next();
	};

	const displayAddresses = () => {
		modal.back();
		qrCodeAddress = undefined;
		qrCodeAddressLabel = undefined;
		qrCodeAddressToken = undefined;
	};
</script>

<WizardModal {steps} bind:currentStep bind:this={modal} on:nnsClose testId={RECEIVE_TOKENS_MODAL}>
	<svelte:fragment slot="title">{$i18n.receive.text.receive}</svelte:fragment>

	{#if currentStep?.name === steps[1].name}
		<ReceiveAddressQRCode
			on:icBack={displayAddresses}
			address={qrCodeAddress}
			addressLabel={qrCodeAddressLabel}
			addressToken={qrCodeAddressToken}
		/>
	{:else}
		<svelte:component this={infoCmp} on:icQRCode={displayQRCode} />
	{/if}
</WizardModal>
