<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import type IcReceiveInfoCkBTC from '$icp/components/receive/IcReceiveInfoCkBTC.svelte';
	import type IcReceiveInfoICP from '$icp/components/receive/IcReceiveInfoICP.svelte';
	import type IcReceiveInfoIcrc from '$icp/components/receive/IcReceiveInfoIcrc.svelte';
	import ReceiveAddressQrCode from '$lib/components/receive/ReceiveAddressQrCode.svelte';
	import type ReceiveAddresses from '$lib/components/receive/ReceiveAddresses.svelte';
	import ReceiveTitle from '$lib/components/receive/ReceiveTitle.svelte';
	import { RECEIVE_TOKENS_MODAL } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ReceiveQRCode } from '$lib/types/receive';
	import type { Token } from '$lib/types/token';

	export let infoCmp:
		| typeof ReceiveAddresses
		| typeof IcReceiveInfoCkBTC
		| typeof IcReceiveInfoICP
		| typeof IcReceiveInfoIcrc;

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
	let copyAriaLabel: string | undefined;

	const displayQRCode = ({ detail }: CustomEvent<ReceiveQRCode>) => {
		({ address, addressLabel, addressToken, copyAriaLabel } = detail);
		modal.next();
	};

	const displayAddresses = () => {
		modal.back();
		address = undefined;
		addressLabel = undefined;
		addressToken = undefined;
		copyAriaLabel = undefined;
	};
</script>

<WizardModal {steps} bind:currentStep bind:this={modal} on:nnsClose testId={RECEIVE_TOKENS_MODAL}>
	<svelte:fragment slot="title">
		{#if currentStep?.name === steps[1].name}
			<ReceiveTitle title={addressToken?.network.name} />
		{:else}
			{$i18n.receive.text.receive}
		{/if}</svelte:fragment
	>

	{#if currentStep?.name === steps[1].name && nonNullish(addressToken)}
		<ReceiveAddressQrCode
			on:icBack={displayAddresses}
			{address}
			{addressLabel}
			{addressToken}
			network={addressToken.network}
			qrCodeAction={{ enabled: false }}
			copyAriaLabel={copyAriaLabel ?? $i18n.wallet.text.wallet_address_copied}
		/>
	{:else}
		<svelte:component this={infoCmp} on:icQRCode={displayQRCode} />
	{/if}
</WizardModal>
