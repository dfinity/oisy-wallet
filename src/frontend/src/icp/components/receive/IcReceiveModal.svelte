<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import IcReceiveInfo from '$icp/components/receive/IcReceiveInfo.svelte';
	import IcReceiveQRCode from '$icp/components/receive/IcReceiveQRCode.svelte';

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
		<IcReceiveInfo on:icQRCode={displayQRCode} />
	{/if}
</WizardModal>
