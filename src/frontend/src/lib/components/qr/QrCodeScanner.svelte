<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import IconScanLine from '$lib/components/icons/IconScanLine.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import QrCodeReader from '$lib/components/ui/QrCodeReader.svelte';
	import { ADDRESS_BOOK_QR_CODE_SCAN } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { QrStatus } from '$lib/types/qr-code';

	interface Props {
		onScan: ({ status, code }: { status: QrStatus; code?: string }) => void;
		expandedLayout?: boolean;
		onBack?: () => void;
	}

	let { onScan, onBack, expandedLayout = false }: Props = $props();

	let resolveQrCodePromise:
		| (({ status, code }: { status: QrStatus; code?: string }) => void)
		| undefined = $state(undefined);

	let cameraPermissionDenied = $state(false);

	onMount(async () => {
		await scanQrCode();
	});

	const scanQrCode = async () => {
		const result = await new Promise<{ status: QrStatus; code?: string | undefined }>((resolve) => {
			resolveQrCodePromise = resolve;
		});

		if (result.status === 'success') {
			onScan(result);
		}

		if (!cameraPermissionDenied) {
			onBack?.();
		}
	};

	const onQRCode = ({ detail: code }: CustomEvent<string>) => {
		resolveQrCodePromise?.({ status: 'success', code });
		resolveQrCodePromise = undefined;
	};

	const onCancel = () => {
		resolveQrCodePromise?.({ status: 'cancelled' });
		resolveQrCodePromise = undefined;
	};

	const onError = (event: CustomEvent<unknown>) => {
		const err = event.detail;

		if (err instanceof DOMException && err.name === 'NotAllowedError') {
			cameraPermissionDenied = true;
		}

		resolveQrCodePromise?.({ status: 'cancelled' });
		resolveQrCodePromise = undefined;
	};
</script>

<div
	class="qr-code-wrapper relative flex w-full items-center justify-center"
	class:h-[60vh]={!expandedLayout}
	class:h-[calc(100vh-128px)]={expandedLayout}
	class:min-h-[300px]={!expandedLayout}
	class:sm:h-[calc(100vh-148px)]={expandedLayout}
	class:sm:max-h-[700px]={expandedLayout}
	class:sm:min-h-[500px]={expandedLayout}
	data-tid={ADDRESS_BOOK_QR_CODE_SCAN}
>
	{#if nonNullish(resolveQrCodePromise)}
		<QrCodeReader
			{expandedLayout}
			on:nnsCancel={onCancel}
			on:nnsQRCode={onQRCode}
			on:nnsQRCodeError={onError}
		/>
	{:else if cameraPermissionDenied}
		<div class="text-center text-sm text-tertiary">
			{$i18n.scanner.text.no_camera_permission}
		</div>
	{:else}
		<div class="absolute inset-0 flex h-full w-full items-center justify-center">
			<Button onclick={scanQrCode} paddingSmall styleClass="max-w-[16rem]">
				<span>{$i18n.scanner.text.scan_qr_code}</span>

				<IconScanLine />
			</Button>
		</div>
	{/if}
</div>

<style lang="scss">
	.qr-code-wrapper {
		color: transparent;
	}
</style>
