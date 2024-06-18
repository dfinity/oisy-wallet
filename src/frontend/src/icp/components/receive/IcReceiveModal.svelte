<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import ReceiveAddressQRCode from '$icp-eth/components/receive/ReceiveAddressQRCode.svelte';
	import type { ComponentType } from 'svelte';
	import { i18n } from '$lib/stores/i18n.store';

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

	const displayQRCode = ({ detail: address }: CustomEvent<string>) => {
		qrCodeAddress = address;
		modal.next();
	};

	const displayAddresses = () => {
		modal.back();
		qrCodeAddress = undefined;
	};
</script>

<WizardModal {steps} bind:currentStep bind:this={modal} on:nnsClose>
	<svelte:fragment slot="title">{$i18n.receive.text.receive}</svelte:fragment>

	{#if currentStep?.name === steps[1].name}
		<ReceiveAddressQRCode on:icBack={displayAddresses} address={qrCodeAddress} />
	{:else}
		<svelte:component this={infoCmp} on:icQRCode={displayQRCode} />
	{/if}
</WizardModal>
