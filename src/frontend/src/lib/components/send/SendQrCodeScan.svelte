<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import QrCodeScanner from '$lib/components/qr/QrCodeScanner.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
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
		onQrCodeBack: () => void;
	}

	let {
		expectedToken,
		destination = $bindable(),
		amount = $bindable(),
		onDecodeQrCode,
		onQrCodeBack
	}: Props = $props();

	const onScan = ({ status, code }: { status: QrStatus; code?: string }) => {
		const qrResponse = onDecodeQrCode({ status, code, expectedToken });

		if (qrResponse.status === 'token_incompatible') {
			toastsError({ msg: { text: $i18n.send.error.incompatible_token } });
			onQrCodeBack();
			return;
		}

		if (nonNullish(qrResponse.destination)) {
			({ destination } = qrResponse);
		}

		if (nonNullish(qrResponse.amount)) {
			({ amount } = qrResponse);
		}

		onQrCodeBack();
	};
</script>

<ContentWithToolbar styleClass="flex flex-col items-center gap-3 md:gap-4 w-full">
	<QrCodeScanner onBack={onQrCodeBack} {onScan} />

	{#snippet toolbar()}
		<ButtonGroup>
			<ButtonBack onclick={onQrCodeBack} />
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
