<script lang="ts">
	import { Modal, QRCodeReaderModal } from '@dfinity/gix-components';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { WebSocketListener } from '$lib/types/listener';
	import { isNullish } from '@dfinity/utils';
	import { onDestroy } from 'svelte';
	import { initWalletConnectListener } from '$lib/services/listener.services';
	import { addressStore } from '$lib/stores/address.store';

	let visible = false;
	let renderQRCodeReader = false;
	let qrCode = undefined;

	const close = () => {
		visible = false;
		renderQRCodeReader = false;
	};

	const error = () =>
		toastsError({
			msg: { text: `Cannot read QR code.` }
		});

	let listener: WebSocketListener | undefined = undefined;

	const initListener = async (uri: string) => {
		close();

		await listener?.disconnect();

		// TODO: for test only
		listener = await initWalletConnectListener({ uri, address: $addressStore! });
	};

	onDestroy(async () => await listener?.disconnect());

	let uri: string = '';
	const connect = async () => {
		console.log(uri);
		await initListener(uri);
	};
</script>

<button on:click={() => (visible = true)} class="secondary text-deep-violet mt-2">
	Wallet connect
</button>

<input type="text" style="background: red" bind:value={uri} on:change={connect} />

<Modal {visible} on:nnsClose={close} on:introend={() => (renderQRCodeReader = true)}>
	<svelte:fragment slot="title">Scan QR Code</svelte:fragment>

	{#if renderQRCodeReader}
		<QRCodeReaderModal
			on:nnsQRCode={async ({ detail: uri }) => await initListener(uri)}
			on:nnsQRCodeError={error}
		/>
	{/if}
</Modal>
