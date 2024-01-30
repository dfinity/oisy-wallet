<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import IcReceiveQRCode from '$icp/components/receive/IcReceiveQRCode.svelte';
	import type { ComponentType } from 'svelte';

	export let infoCmp: ComponentType;

	const steps: WizardSteps = [
		{
			name: 'Receive',
			title: 'Receive'
		},
		{
			name: 'QR code',
			title: 'QR code'
		}
	];

	let currentStep: WizardStep | undefined;
	let modal: WizardModal;

	let qrCodeAddressType: undefined | 'icrc' | 'icp';

	const displayQRCode = ({ detail: step }: CustomEvent<'icrc' | 'icp'>) => {
		qrCodeAddressType = step;
		modal.next();
	};

	const displayAddresses = () => {
		modal.back();
		qrCodeAddressType = undefined;
	};
</script>

<WizardModal {steps} bind:currentStep bind:this={modal} on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">Receive</svelte:fragment>

	{#if currentStep?.name === steps[1].name}
		<IcReceiveQRCode on:icBack={displayAddresses} {qrCodeAddressType} />
	{:else}
		<svelte:component this={infoCmp} on:icQRCode={displayQRCode} />
	{/if}
</WizardModal>
