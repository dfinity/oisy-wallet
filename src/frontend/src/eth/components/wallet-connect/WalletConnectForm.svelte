<script lang="ts">
	import { QRCodeReader } from '@dfinity/gix-components';
	import { createEventDispatcher } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import InputText from '$lib/components/ui/InputText.svelte';
	import {
		TRACK_COUNT_WALLET_CONNECT,
		TRACK_COUNT_WALLET_CONNECT_QR_CODE
	} from '$lib/constants/analytics.contants';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';

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

<ContentWithToolbar>
	<div class="qr-code rounded-lg">
		{#if renderQRCodeReader}
			<QRCodeReader on:nnsQRCode={onQRCodeSuccess} on:nnsQRCodeError={error} />
		{/if}

		{#if !renderQRCodeReader}
			<Button
				type="button"
				styleClass="inset-center"
				colorStyle="primary"
				paddingSmall
				on:click={() => (renderQRCodeReader = true)}>{$i18n.wallet_connect.text.scan_qr}</Button
			>
		{/if}
	</div>

	<p class="pb-2 pt-4 text-center">{$i18n.wallet_connect.text.or_use_link}</p>

	<InputText name="uri" placeholder={$i18n.wallet_connect.alt.connect_input} bind:value={uri} />

	<ButtonGroup slot="toolbar">
		<Button disabled={invalid} on:click={onClick}>
			{$i18n.wallet_connect.text.connect}
		</Button>
	</ButtonGroup>
</ContentWithToolbar>

<style lang="scss">
	.qr-code {
		position: relative;

		outline-offset: var(--padding-0_25x);
		outline: var(--color-secondary) dashed var(--padding-0_5x);
		--primary-rgb: 59, 0, 185;
		overflow: hidden;

		margin: var(--padding-4x) auto 0;

		width: 100%;
		max-width: calc(100% - var(--padding-3x));

		aspect-ratio: 4 / 3;

		@media only screen and (hover: none) and (pointer: coarse) {
			aspect-ratio: 1 / 1;
		}

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
