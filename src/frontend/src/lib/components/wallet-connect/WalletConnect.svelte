<script lang="ts">
	import { Input, Modal, QRCodeReader } from '@dfinity/gix-components';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { WebSocketListener } from '$lib/types/listener';
	import { onDestroy } from 'svelte';
	import { initWalletConnectListener } from '$lib/services/listener.services';
	import { addressStore } from '$lib/stores/address.store';
	import { fade } from 'svelte/transition';

	let visible = false;
	let renderQRCodeReader = false;

	const close = () => {
		visible = false;
		renderQRCodeReader = false;
	};

	const error = () => {
		renderQRCodeReader = false;

		toastsError({
			msg: { text: `Cannot read QR code.` }
		});
	};

	let listener: WebSocketListener | undefined = undefined;

	const initListener = async (uri: string) => {
		await listener?.disconnect();

		try {
			// TODO: for test only
			listener = await initWalletConnectListener({ uri, address: $addressStore! });

			await listener.pair();
		} catch (err: unknown) {
			toastsError({
				msg: { text: `An unexpected error happened while trying to connect the wallet.` },
				err
			});
		}
	};

	onDestroy(async () => await listener?.disconnect());

	let uri: string = '';

	const connect = async () => {
		if (!uri) {
			toastsError({
				msg: { text: `An uri to connect to should be provided.` }
			});
			return;
		}

		await initListener(uri);
	};

	let invalid = true;
	$: invalid = !uri;
</script>

<button on:click={() => (visible = true)} class="secondary text-deep-violet mt-2">
	WalletConnect
</button>

<Modal {visible} on:nnsClose={close}>
	<svelte:fragment slot="title">WalletConnect</svelte:fragment>

	<div class="rounded-lg qr-code">
		{#if renderQRCodeReader}
			<QRCodeReader on:nnsQRCode={async ({ detail }) => (uri = detail)} on:nnsQRCodeError={error} />
		{/if}

		{#if !renderQRCodeReader}
			<button
				type="button"
				class="tertiary inset-center"
				out:fade
				on:click={() => (renderQRCodeReader = true)}>Scan QR code</button
			>
		{/if}
	</div>

	<p class="text-center p-2 text-xs">or use walletconnect uri</p>

	<Input
		name="uri"
		required
		inputType="text"
		placeholder="e.g. wc:a281567bb3e4..."
		bind:value={uri}
	/>

	<div class="flex justify-end gap-1 mt-2">
		<button class="primary" disabled={invalid} class:opacity-15={invalid} on:click={connect}>
			Connect
		</button>
	</div>
</Modal>

<style lang="scss">
	@use '../../../../../../node_modules/@dfinity/gix-components/dist/styles/mixins/media';

	.qr-code {
		position: relative;

		border: 1px dashed var(--color-vampire-black);

		margin: 0 auto;

		width: 100%;

		@include media.min-width(small) {
			width: calc(var(--dialog-width) - (4 * var(--padding-8x)));
		}

		@media only screen and (hover: none) and (pointer: coarse) {
			aspect-ratio: 1 / 1;
		}

		aspect-ratio: 4 / 3;
	}
</style>
