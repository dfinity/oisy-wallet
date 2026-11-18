<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { tick } from 'svelte';
	import ReceiveAddressQrCode from '$lib/components/receive/ReceiveAddressQrCode.svelte';
	import type ReceiveAddresses from '$lib/components/receive/ReceiveAddresses.svelte';
	import ReceiveTitle from '$lib/components/receive/ReceiveTitle.svelte';
	import WizardModal from '$lib/components/ui/WizardModal.svelte';
	import { RECEIVE_TOKENS_MODAL } from '$lib/constants/test-ids.constants';
	import { WizardStepsReceiveAddress } from '$lib/enums/wizard-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Network } from '$lib/types/network';
	import type { ReceiveQRCode } from '$lib/types/receive';
	import type { Token } from '$lib/types/token';
	import type { WizardStep, WizardSteps } from '$lib/types/wizard';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { closeModal } from '$lib/utils/modal.utils';

	interface Props {
		infoCmp: typeof ReceiveAddresses;
		// Your addresses names the list and each QR code after the address, not after Receive.
		title?: string;
		onClose?: () => void;
	}

	let { infoCmp: InfoCmp, title: listTitle, onClose }: Props = $props();

	// The title is fixed for the life of the modal.
	// svelte-ignore state_referenced_locally
	const steps: WizardSteps<WizardStepsReceiveAddress> = [
		{
			name: WizardStepsReceiveAddress.RECEIVE,
			title: listTitle ?? $i18n.receive.text.receive
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
	let networks = $state<Network[] | undefined>();

	const displayQRCode = (detail: ReceiveQRCode) => {
		if (isNullish(modal)) {
			return;
		}

		({ address, addressLabel, addressToken, copyAriaLabel, networks } = detail);

		modal.next();

		focusContent();
	};

	// The step's content is replaced on every change, so focus is placed again: on the QR code detail
	// when it opens, and back on the QR button of the row it came from, which the list focuses itself.
	let content = $state<HTMLDivElement | undefined>();
	let returnFocusAddress = $state<string | undefined>();

	const focusContent = async () => {
		await tick();
		content?.focus({ preventScroll: true });
	};

	const displayAddresses = () => {
		if (isNullish(modal)) {
			return;
		}

		returnFocusAddress = address;

		modal.back();

		address = undefined;
		addressLabel = undefined;
		addressToken = undefined;
		copyAriaLabel = undefined;
		networks = undefined;
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
		{#if currentStep?.name === steps[1].name && nonNullish(listTitle) && nonNullish(addressLabel)}
			{addressLabel}
		{:else if currentStep?.name === steps[1].name}
			<ReceiveTitle title={addressToken?.network.name} />
		{:else}
			{listTitle ?? $i18n.receive.text.receive}
		{/if}
	{/snippet}

	<div bind:this={content} class="outline-none" tabindex="-1">
		{#key currentStep?.name}
			{#if currentStep?.name === steps[1].name && nonNullish(addressToken) && nonNullish(networks)}
				<!-- The shared EVM address keeps the list of the networks it serves beside its QR code. -->
				<ReceiveAddressQrCode
					{address}
					{addressLabel}
					{addressToken}
					copyAriaLabel={copyAriaLabel ?? $i18n.wallet.text.wallet_address_copied}
					network={addressToken.network}
					onBack={displayAddresses}
					qrSize="compact"
				>
					{#snippet text()}
						{replacePlaceholders($i18n.receive.addresses.text.evm_networks, {
							$networks: networks?.map(({ name }) => name).join(', ') ?? ''
						})}
					{/snippet}
				</ReceiveAddressQrCode>
			{:else if currentStep?.name === steps[1].name && nonNullish(addressToken)}
				<ReceiveAddressQrCode
					{address}
					{addressLabel}
					{addressToken}
					copyAriaLabel={copyAriaLabel ?? $i18n.wallet.text.wallet_address_copied}
					network={addressToken.network}
					onBack={displayAddresses}
					qrSize="compact"
				/>
			{:else}
				<InfoCmp focusAddress={returnFocusAddress} onQRCode={displayQRCode} />
			{/if}
		{/key}
	</div>
</WizardModal>
