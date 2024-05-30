<script lang="ts">
	import { QRCodeReader } from '@dfinity/gix-components';
	import { toastsError } from '$lib/stores/toasts.store';
	import { nonNullish } from '@dfinity/utils';
	import type { Token } from '@dfinity/utils';
	import type { QrStatus } from '$lib/types/qr-code';
	import { i18n } from '$lib/stores/i18n.store';
	import { createEventDispatcher, onMount } from 'svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';

	export let expectedToken: Token;
	export let destination: string | undefined;
	export let amount: number | undefined;
	export let decodeQrCode: (args: {
		status: QrStatus;
		code?: string;
		expectedToken: Token;
	}) => { status: QrStatus; destination?: string; amount?: number };

	const dispatch = createEventDispatcher();

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

		const qrResponse = decodeQrCode({ status, code, expectedToken });

		if (qrResponse.status === 'token_incompatible') {
			toastsError({ msg: { text: $i18n.send.error.incompatible_token } });
			back();
			return;
		}

		if (nonNullish(qrResponse.destination)) {
			destination = qrResponse.destination;
		}

		if (nonNullish(qrResponse.amount)) {
			amount = qrResponse.amount;
		}

		back();
	};

	const onQRCode = ({ detail: code }: CustomEvent<string>) => {
		resolveQrCodePromise?.({ status: 'success', code });
		resolveQrCodePromise = undefined;
	};

	const onCancel = () => {
		resolveQrCodePromise?.({ status: 'cancelled' });
		resolveQrCodePromise = undefined;
	};

	const back = () => {
		dispatch('icBack');
	};
</script>

<div class="stretch">
	<QRCodeReader on:nnsCancel={onCancel} on:nnsQRCode={onQRCode} />
</div>

<ButtonGroup>
	<button class="secondary block flex-1" on:click={back}>
		{$i18n.core.text.back}
	</button>
</ButtonGroup>
