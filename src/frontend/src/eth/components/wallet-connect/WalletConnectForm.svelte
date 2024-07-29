<script lang="ts">
	import { Input, QRCodeReader } from '@dfinity/gix-components';
	import { toastsError } from '$lib/stores/toasts.store';
	import { createEventDispatcher } from 'svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import { trackEvent } from '$lib/services/analytics.services';
	import {
		TRACK_COUNT_WALLET_CONNECT,
		TRACK_COUNT_WALLET_CONNECT_QR_CODE
	} from '$lib/constants/analytics.contants';

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

	const connect = (): 'success' | 'error' => {
		if (!uri) {
			toastsError({
				msg: { text: $i18n.wallet_connect.error.missing_uri }
			});
			return 'error';
		}

		dispatch('icConnect', uri);

		return 'success';
	};

	const onClick = async () => {
		const result = connect();

		if (result === 'error') {
			return;
		}

		await trackEvent({
			name: TRACK_COUNT_WALLET_CONNECT
		});
	};

	const onQRCodeSuccess = async ({ detail }: CustomEvent<string>) => {
		uri = detail;

		connect();

		await trackEvent({
			name: TRACK_COUNT_WALLET_CONNECT_QR_CODE
		});
	};
</script>

<div class="stretch">
	<div class="rounded-lg qr-code">
		{#if renderQRCodeReader}
			<QRCodeReader on:nnsQRCode={onQRCodeSuccess} on:nnsQRCodeError={error} />
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
</div>

<ButtonGroup>
	<button
		class="primary block flex-1"
		disabled={invalid}
		class:opacity-10={invalid}
		on:click={onClick}
	>
		{$i18n.wallet_connect.text.connect}
	</button>
</ButtonGroup>

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
