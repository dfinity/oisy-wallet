<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import ReceiveAddressQRCode from '$lib/components/receive/ReceiveAddressQRCode.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	export let qrCodeAddress: undefined | string;
	export let qrCodeAddressLabel: undefined | string;
</script>

<Modal on:nnsClose>
	<svelte:fragment slot="title">{$i18n.receive.text.receive}</svelte:fragment>
	<ReceiveAddressQRCode address={qrCodeAddress} addressLabel={qrCodeAddressLabel} />
</Modal>
