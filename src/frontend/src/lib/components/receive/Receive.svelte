<script lang="ts">
	import ReceiveAddressModal from '$lib/components/receive/ReceiveAddressModal.svelte';
	import ReceiveAddresses from '$lib/components/receive/ReceiveAddresses.svelte';
	import { modalReceive } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import type { ReceiveQRCode } from '$lib/types/receive';

	const modalId = Symbol();

	let qrCodeAddress: undefined | string;
	let qrCodeAddressLabel: undefined | string;

	const displayQRCode = ({ detail: { address, addressLabel } }: CustomEvent<ReceiveQRCode>) => {
		qrCodeAddress = address;
		qrCodeAddressLabel = addressLabel;
		modalStore.openReceive(modalId);
	};
</script>

<ReceiveAddresses on:icQRCode={displayQRCode} />

{#if $modalReceive && $modalStore?.data === modalId}
	<ReceiveAddressModal bind:qrCodeAddress bind:qrCodeAddressLabel on:nnsClose={modalStore.close} />
{/if}
