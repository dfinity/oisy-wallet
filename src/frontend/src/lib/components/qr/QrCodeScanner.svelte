<script lang="ts">
	import { QRCodeReader } from '@dfinity/gix-components';
	import { onMount } from 'svelte';
	import { ADDRESS_BOOK_QR_CODE_SCAN } from '$lib/constants/test-ids.constants';
	import type { QrStatus } from '$lib/types/qr-code';

	interface Props {
		onScan: ({ status, code }: { status: QrStatus; code?: string }) => void;
		onBack: () => void;
	}

	let { onScan, onBack }: Props = $props();

	let resolveQrCodePromise:
		| (({ status, code }: { status: QrStatus; code?: string }) => void)
		| undefined = undefined;

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

		onBack();
	};

	const onQRCode = ({ detail: code }: CustomEvent<string>) => {
		resolveQrCodePromise?.({ status: 'success', code });
		resolveQrCodePromise = undefined;
	};

	const onCancel = () => {
		resolveQrCodePromise?.({ status: 'cancelled' });
		resolveQrCodePromise = undefined;
	};
</script>

<div
	class="stretch qr-code-wrapper h-full w-full md:min-h-[300px]"
	data-tid={ADDRESS_BOOK_QR_CODE_SCAN}
>
	<QRCodeReader on:nnsCancel={onCancel} on:nnsQRCode={onQRCode} />
</div>

<style lang="scss">
	.qr-code-wrapper {
		color: transparent;
	}
</style>
