<script lang="ts">
	import { Input, QRCodeReader } from '@dfinity/gix-components';
	import { toastsError } from '$lib/stores/toasts.store';
	import { createEventDispatcher } from 'svelte';
	import { i18n } from '$lib/stores/i18n.store';

	let renderQRCodeReader = false;

	const error = () => {
		renderQRCodeReader = false;

		toastsError({
			msg: { text: $i18n.wallet_connect.error.qr_code_read }
		});
	};

	let uri = '';

	let invalid = true;
	$: invalid = !uri;

	const dispatch = createEventDispatcher();

	const connect = () => {
		if (!uri) {
			toastsError({
				msg: { text: $i18n.wallet_connect.error.missing_uri }
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
		<button
			type="button"
			class="wallet-connect inset-center text-white font-bold text-center"
			style="padding: var(--padding) var(--padding-3x)"
			on:click={() => (renderQRCodeReader = true)}>{$i18n.wallet_connect.text.scan_qr}</button
		>
	{/if}
</div>

<p class="text-center pt-4 pb-2">{$i18n.wallet_connect.text.or_use_uri}</p>

<Input
	name="uri"
	required
	inputType="text"
	placeholder="e.g. wc:a281567bb3e4..."
	bind:value={uri}
/>

<div class="flex justify-end gap-1 mt-4">
	<button class="primary" disabled={invalid} class:opacity-10={invalid} on:click={connect}>
		{$i18n.wallet_connect.text.connect}
	</button>
</div>

<style lang="scss">
	.qr-code {
		position: relative;

		outline-offset: var(--padding-0_25x);
		outline: var(--color-dark) dashed var(--padding-0_5x);
		--primary-rgb: 59, 0, 185;
		overflow: hidden;

		margin: var(--padding-4x) auto 0;

		width: 100%;
		max-width: calc(100% - var(--padding-3x));

		@include media.min-width(small) {
			width: calc(var(--dialog-width) - (4 * var(--padding-8x)));
			max-width: inherit;
		}

		@media only screen and (hover: none) and (pointer: coarse) {
			aspect-ratio: 1 / 1;
		}

		aspect-ratio: 4 / 3;

		:global(article.reader) {
			position: absolute !important;
			top: 50%;
			left: 50%;
		}

		:global(article.reader:not(.mirror)) {
			transform: translate(-50%, -50%);
		}

		:global(article.reader.mirror) {
			transform: translate(-50%, -50%) scaleX(-1);
		}
	}
</style>
