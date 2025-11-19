<script lang="ts">
	import QrCodeScanner from '$lib/components/qr/QrCodeScanner.svelte';
	import { busy } from '$lib/stores/busy.store';
	import type { QrStatus } from '$lib/types/qr-code';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import IconChain from '$lib/components/icons/IconChain.svelte';
	import BottomSheet from '$lib/components/ui/BottomSheet.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ScannerCodeInput from '$lib/components/scanner/ScannerCodeInput.svelte';
	import { isEmptyString } from '@dfinity/utils';
	import { processOpenCryptoPayCode } from '$lib/services/open-crypto-pay.services';
	import { getContext } from 'svelte';
	import { PAY_CONTEXT_KEY, type PayContext } from '$lib/stores/open-crypto-pay.store';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		onNext: () => void;
	}

	let { onNext }: Props = $props();

	let openBottomSheet = $state(false);
	let uri = $state('');
	let error = $state('');
	let invalid = $derived(!uri);

	const { setData } = getContext<PayContext>(PAY_CONTEXT_KEY);

	const processCode = async (code: string) => {
		busy.start();

		error = '';

		try {
			const paymentData = await processOpenCryptoPayCode(code);

			setData(paymentData);

			onNext();
		} catch (_: unknown) {
			error = $i18n.scanner.error.code_link_is_not_valid;
		} finally {
			busy.stop();
		}
	};

	const handleScan = async ({ status, code }: { status: QrStatus; code?: string }) => {
		if (status !== 'success' || !code) return;
		await processCode(code);
	};

	const handleManualConnect = async () => {
		await processCode(uri);
	};

	$effect(() => {
		if (isEmptyString(uri)) {
			error = '';
		}
	});
</script>

<ContentWithToolbar styleClass="flex flex-col gap-3 md:gap-4 w-full">
	<QrCodeScanner onScan={handleScan} />

	<Responsive up="md">
		<ScannerCodeInput
			bind:value={uri}
			{error}
			label={$i18n.scanner.text.url_or_code}
			placeholder={$i18n.scanner.text.enter_or_paste_code}
			name="uri"
		/>
	</Responsive>

	<Responsive down="sm">
		<BottomSheet bind:visible={openBottomSheet} contentClass="min-h-[10vh]">
			{#snippet content()}
				<div class="mb-4">
					<ScannerCodeInput
						bind:value={uri}
						{error}
						label={$i18n.scanner.text.url_or_code}
						placeholder={$i18n.scanner.text.enter_or_paste_code}
						name="uri"
					/>
				</div>
			{/snippet}

			{#snippet footer()}
				<Button onclick={handleManualConnect} disabled={invalid} fullWidth
					>{$i18n.core.text.continue}</Button
				>
			{/snippet}
		</BottomSheet>
	</Responsive>

	{#snippet toolbar()}
		<Responsive up="md">
			<ButtonGroup>
				<Button disabled={invalid} onclick={handleManualConnect}>{$i18n.core.text.continue}</Button>
			</ButtonGroup>
		</Responsive>

		<Responsive down="sm">
			<div class="mb-4 flex flex-0">
				<Button
					colorStyle="primary"
					innerStyleClass="flex items-center justify-center"
					link
					onclick={() => {
						uri = '';
						error = '';
						openBottomSheet = true;
					}}
					testId="button-enter-manually"
				>
					{$i18n.scanner.text.enter_manually}
					<IconChain />
				</Button>
			</div>
		</Responsive>
	{/snippet}
</ContentWithToolbar>
