<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { QrResponse, QrStatus } from '$lib/types/qr-code';
	import type { OptionAmount } from '$lib/types/send';
	import type { OptionToken } from '$lib/types/token';
	import QrCodeScanner from '$lib/components/qr/QrCodeScanner.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';

	export let expectedToken: OptionToken;
	export let destination: string | undefined;
	export let amount: OptionAmount;
	export let decodeQrCode: ({
		status,
		code,
		expectedToken
	}: {
		status: QrStatus;
		code?: string;
		expectedToken: OptionToken;
	}) => QrResponse;

	const dispatch = createEventDispatcher();

	const onBack = () => {
		dispatch('icQRCodeBack');
	};

	const onScan = ({ status, code }: { status: QrStatus; code?: string }) => {
		const qrResponse = decodeQrCode({ status, code, expectedToken });

		if (qrResponse.status === 'token_incompatible') {
			toastsError({ msg: { text: $i18n.send.error.incompatible_token } });
			onBack();
			return;
		}

		if (nonNullish(qrResponse.destination)) {
			({ destination } = qrResponse);
		}

		if (nonNullish(qrResponse.amount)) {
			({ amount } = qrResponse);
		}

		onBack();
	}
</script>

<ContentWithToolbar styleClass="flex flex-col items-center gap-3 md:gap-4 w-full">
	<QrCodeScanner {onScan} {onBack} />

	<ButtonGroup slot="toolbar">
		<ButtonBack onclick={onBack} />
	</ButtonGroup>
</ContentWithToolbar>