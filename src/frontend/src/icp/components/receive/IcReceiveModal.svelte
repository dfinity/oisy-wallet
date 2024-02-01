<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import ReceiveAddressQRCode from '$icp-eth/components/receive/ReceiveAddressQRCode.svelte';
	import type { ComponentType } from 'svelte';

	export let infoCmp: ComponentType;

	const steps: WizardSteps = [
		{
			name: 'Receive',
			title: 'Receive'
		},
		{
			name: 'QR code',
			title: 'Receive address'
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

<WizardModal {steps} bind:currentStep bind:this={modal} on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">Receive</svelte:fragment>

	{#if currentStep?.name === steps[1].name}
		<ReceiveAddressQRCode on:icBack={displayAddresses} address={qrCodeAddress} />
	{:else}
		<svelte:component this={infoCmp} on:icQRCode={displayQRCode} />
	{/if}
</WizardModal>
