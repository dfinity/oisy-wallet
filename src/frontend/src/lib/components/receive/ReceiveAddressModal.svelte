<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
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

	let address: undefined | string;
	let addressLabel: undefined | string;
	let addressToken: Token | undefined;
	let qrCodeAriaLabel: string | undefined;
	let copyAriaLabel: string | undefined;

	const displayQRCode = ({
		detail: {
			address: a,
			addressLabel: aL,
			addressToken: aT,
			qrCodeAriaLabel: qrL,
			copyAriaLabel: cAL
		}
	}: CustomEvent<ReceiveQRCode>) => {
		address = a;
		addressLabel = aL;
		addressToken = aT;
		qrCodeAriaLabel = qrL;
		copyAriaLabel = cAL;
		modal.next();
	};

	const displayAddresses = () => {
		modal.back();
		address = undefined;
		addressLabel = undefined;
		addressToken = undefined;
		qrCodeAriaLabel = undefined;
		copyAriaLabel = undefined;
	};
</script>

<WizardModal {steps} bind:currentStep bind:this={modal} on:nnsClose testId={RECEIVE_TOKENS_MODAL}>
	<svelte:fragment slot="title">{$i18n.receive.text.receive}</svelte:fragment>

	{#if currentStep?.name === steps[1].name && nonNullish(addressToken)}
		<ReceiveAddressQRCode
			on:icBack={displayAddresses}
			{address}
			{addressLabel}
			{addressToken}
			network={addressToken.network}
			qrCodeAriaLabel={qrCodeAriaLabel ?? $i18n.wallet.text.display_wallet_address_qr}
			copyAriaLabel={copyAriaLabel ?? $i18n.wallet.text.wallet_address_copied}
		/>
	{:else}
		<svelte:component this={infoCmp} on:icQRCode={displayQRCode} />
	{/if}
</WizardModal>
