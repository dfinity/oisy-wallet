<script lang="ts">
	import { QRCodeReader } from '@dfinity/gix-components';
	import { onMount } from 'svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import {
		ADDRESS_BOOK_CANCEL_BUTTON,
		ADDRESS_BOOK_QR_CODE_SCAN
	} from '$lib/constants/test-ids.constants';
	import type { QrStatus } from '$lib/types/qr-code';

	interface Props {
		onClose: () => void;
		address: string | undefined;
	}

	let { onClose, address = $bindable() }: Props = $props();

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

		const { status, code } = result;

		if (status === 'success') {
			address = code;
		}

		onClose();
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

<ContentWithToolbar styleClass="flex flex-col items-center gap-3 md:gap-4 w-full">
	<div class="qr-code-wrapper h-full w-full md:min-h-[300px]" data-tid={ADDRESS_BOOK_QR_CODE_SCAN}>
		<QRCodeReader on:nnsCancel={onCancel} on:nnsQRCode={onQRCode} />
	</div>

	<ButtonGroup slot="toolbar">
		<ButtonCancel onclick={onClose} testId={ADDRESS_BOOK_CANCEL_BUTTON} />
	</ButtonGroup>
</ContentWithToolbar>

<style lang="scss">
	.qr-code-wrapper {
		--primary-rgb: 50, 20, 105;
		color: rgba(var(--primary-rgb), 0.6);
	}
</style>
