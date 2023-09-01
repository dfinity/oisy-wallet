<script lang="ts">
	import { Input, QRCodeReader } from '@dfinity/gix-components';
	import { toastsError } from '$lib/stores/toasts.store';
	import { createEventDispatcher } from 'svelte';

	let renderQRCodeReader = false;

	const error = () => {
		renderQRCodeReader = false;

		toastsError({
			msg: { text: `Cannot read QR code.` }
		});
	};

	let uri: string = '';

	let invalid = true;
	$: invalid = !uri;

	const dispatch = createEventDispatcher();

	const connect = () => {
		if (!uri) {
			toastsError({
				msg: { text: `An uri to connect to should be provided.` }
			});
			return;
		}

		dispatch('icConnect', uri);
	};
</script>

<div class="rounded-lg qr-code">
	{#if renderQRCodeReader}
		<QRCodeReader on:nnsQRCode={async ({ detail }) => (uri = detail)} on:nnsQRCodeError={error} />
	{/if}

	{#if !renderQRCodeReader}
		<button type="button" class="tertiary inset-center" on:click={() => (renderQRCodeReader = true)}
			>Scan QR code</button
		>
	{/if}
</div>

<p class="text-center p-2 text-base">or use walletconnect uri</p>

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
