<script lang="ts">
	import { QRCodeReader } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { QrResponse, QrStatus } from '$lib/types/qr-code';
	import type { OptionAmount } from '$lib/types/send';
	import type { OptionToken } from '$lib/types/token';

	interface Props {
		expectedToken: OptionToken;
		destination: string | undefined;
		amount: OptionAmount;
		onDecodeQrCode: ({
			status,
			code,
			expectedToken
		}: {
			status: QrStatus;
			code?: string;
			expectedToken: OptionToken;
		}) => QrResponse;
		onIcQrCodeBack: () => void;
	}

	let {
		expectedToken,
		destination = $bindable(),
		amount = $bindable(),
		onDecodeQrCode,
		onIcQrCodeBack
	}: Props = $props();

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

		const qrResponse = onDecodeQrCode({ status, code, expectedToken });

		if (qrResponse.status === 'token_incompatible') {
			toastsError({ msg: { text: $i18n.send.error.incompatible_token } });
			onIcQrCodeBack();
			return;
		}

		if (nonNullish(qrResponse.destination)) {
			({ destination } = qrResponse);
		}

		if (nonNullish(qrResponse.amount)) {
			({ amount } = qrResponse);
		}

		onIcQrCodeBack();
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

<div class="stretch qr-code-wrapper md:min-h-[300px]">
	<QRCodeReader on:nnsCancel={onCancel} on:nnsQRCode={onQRCode} />
</div>

<ButtonGroup>
	<ButtonBack onclick={onIcQrCodeBack} />
</ButtonGroup>

<style lang="scss">
	.qr-code-wrapper {
		--primary-rgb: 50, 20, 105;
		color: rgba(var(--primary-rgb), 0.6);
	}
</style>
