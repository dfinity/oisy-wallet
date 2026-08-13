<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import IconScanLine from '$lib/components/icons/IconScanLine.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import QrCodeReader from '$lib/components/ui/QrCodeReader.svelte';
	import { ADDRESS_BOOK_QR_CODE_SCAN } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { QrStatus } from '$lib/types/qr-code';
	import { isMobile } from '$lib/utils/device.utils';

	interface Props {
		onScan: ({ status, code }: { status: QrStatus; code?: string }) => void;
		universalScanner?: boolean;
		onBack?: () => void;
	}

	let { onScan, onBack, universalScanner = false }: Props = $props();

	let resolveQrCodePromise:
		(({ status, code }: { status: QrStatus; code?: string }) => void) | undefined =
		$state(undefined);

	let cameraPermissionDenied = $state(false);

	onMount(async () => {
		if (isMobile() || !universalScanner) {
			await scanQrCode();
		}
	});

	const scanQrCode = async () => {
		let keepScanning = true;
		while (keepScanning) {
			const result = await new Promise<{ status: QrStatus; code?: string | undefined }>(
				(resolve) => {
					resolveQrCodePromise = resolve;
				}
			);

			if (result.status === 'success') {
				onScan(result);
				keepScanning = isMobile() && universalScanner;
			} else {
				keepScanning = false;
			}
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
	class="qr-code-wrapper relative flex w-full items-start justify-center"
	class:h-[60vh]={!universalScanner}
	class:h-[calc(100dvh-128px)]={universalScanner}
	class:min-h-[300px]={!universalScanner}
	class:sm:h-[calc(100dvh-148px)]={universalScanner}
	class:sm:max-h-[700px]={universalScanner}
	class:sm:min-h-[500px]={universalScanner}
	data-tid={ADDRESS_BOOK_QR_CODE_SCAN}
>
	{#if nonNullish(resolveQrCodePromise)}
		<QrCodeReader
			{universalScanner}
			on:nnsCancel={onCancel}
			on:nnsQRCode={onQRCode}
			on:nnsQRCodeError={onError}
		/>
	{:else}
		<div
			class="flex w-[90%] items-center justify-center rounded-lg border border-dashed border-secondary"
			class:h-[60%]={universalScanner}
			class:h-full={!universalScanner}
			class:my-10={universalScanner}
			class:sm:h-[calc(100%-280px)]={universalScanner}
		>
			{#if cameraPermissionDenied}
				<div class="text-center text-sm text-tertiary">
					{$i18n.scanner.text.no_camera_permission}
				</div>
			{:else}
				<Button onclick={scanQrCode} paddingSmall styleClass="max-w-[16rem]">
					<span>{$i18n.scanner.text.scan_qr_code}</span>

					<IconScanLine />
				</Button>
			{/if}
		</div>
	{/if}
</div>

<style lang="scss">
	.qr-code-wrapper {
		color: transparent;
	}
</style>
