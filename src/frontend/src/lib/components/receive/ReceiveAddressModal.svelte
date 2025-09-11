<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
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

	interface Props {
		infoCmp:
			| typeof ReceiveAddresses
			| typeof IcReceiveInfoCkBTC
			| typeof IcReceiveInfoICP
			| typeof IcReceiveInfoIcrc;
	}

	let { infoCmp }: Props = $props();

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

	let currentStep: WizardStep<WizardStepsReceiveAddress> | undefined = $state();
	let modal: WizardModal<WizardStepsReceiveAddress> = $state();

	let address: undefined | string = $state();
	let addressLabel: undefined | string = $state();
	let addressToken: Token | undefined = $state();
	let copyAriaLabel: string | undefined = $state();

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

	const dispatch = createEventDispatcher();
</script>

<WizardModal
	bind:this={modal}
	onClose={() => dispatch('nnsClose')}
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

	{#if currentStep?.name === steps[1].name && nonNullish(addressToken)}
		<ReceiveAddressQrCode
			{address}
			{addressLabel}
			{addressToken}
			copyAriaLabel={copyAriaLabel ?? $i18n.wallet.text.wallet_address_copied}
			network={addressToken.network}
			qrCodeAction={{ enabled: false }}
			on:icBack={displayAddresses}
		/>
	{:else}
		{@const SvelteComponent = infoCmp}
		<SvelteComponent on:icQRCode={displayQRCode} />
	{/if}
</WizardModal>
