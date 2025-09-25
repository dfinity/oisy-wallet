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

	const onClick = () => {
		const result = connect();

		if (result === 'error') {
			return;
		}

		trackEvent({
			name: TRACK_COUNT_WALLET_CONNECT
		});
	};

	const onQRCodeSuccess = ({ detail }: CustomEvent<string>) => {
		uri = detail;

		connect();

		trackEvent({
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
				colorStyle="primary"
				onclick={() => (renderQRCodeReader = true)}
				paddingSmall
				styleClass="inset-center"
				type="button">{$i18n.wallet_connect.text.scan_qr}</Button
			>
		{/if}
	</div>

	<p class="mb-1 pt-4 text-center">{$i18n.wallet_connect.text.or_use_link}</p>

	<div class="mb-4">
		<InputText name="uri" placeholder={$i18n.wallet_connect.alt.connect_input} bind:value={uri} />
	</div>

	{#snippet toolbar()}
		<ButtonGroup>
			<Button disabled={invalid} onclick={onClick}>
				{$i18n.wallet_connect.text.connect}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>

<style lang="scss">
	.qr-code {
		position: relative;

		outline-offset: var(--padding-0_25x);
		outline: var(--color-foreground-tertiary) dashed var(--padding-0_25x);
		color: transparent;
		overflow: hidden;

		margin: 0 auto;

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
