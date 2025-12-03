<script lang="ts">
	import { isEmptyString, isNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import IconChain from '$lib/components/icons/IconChain.svelte';
	import QrCodeScanner from '$lib/components/qr/QrCodeScanner.svelte';
	import ScannerCodeInput from '$lib/components/scanner/ScannerCodeInput.svelte';
	import BottomSheet from '$lib/components/ui/BottomSheet.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import { OPEN_CRYPTO_PAY_ENTER_MANUALLY_BUTTON } from '$lib/constants/test-ids.constants';
	import {
		calculateTokensWithFees,
		processOpenCryptoPayCode
	} from '$lib/services/open-crypto-pay.services';
	import { busy } from '$lib/stores/busy.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { PAY_CONTEXT_KEY, type PayContext } from '$lib/stores/open-crypto-pay.store';
	import type { QrStatus } from '$lib/types/qr-code';
	import { ethAddress } from '$lib/derived/address.derived';
	import { networksMainnets } from '$lib/derived/networks.derived';
	import { enabledTokens } from '$lib/derived/tokens.derived';
	import { prepareBasePayableTokens } from '$lib/utils/open-crypto-pay.utils';

	interface Props {
		onNext: () => void;
	}

	let { onNext }: Props = $props();

	let openBottomSheet = $state(false);
	let uri = $state('');
	let error = $state('');
	let isEmptyUri = $derived(isEmptyString(uri));

	const { setData, setTokensWithFees } = getContext<PayContext>(PAY_CONTEXT_KEY);

	const processCode = async (code: string) => {
		busy.start();

		error = '';

		if (isNullish($ethAddress)) {
			return;
		}

		try {
			const paymentData = await processOpenCryptoPayCode(code);

			setData(paymentData);

			const baseTokens = prepareBasePayableTokens({
				transferAmounts: paymentData.transferAmounts,
				networks: $networksMainnets,
				availableTokens: $enabledTokens
			});

			const tokensWithFees = await calculateTokensWithFees({
				tokens: baseTokens,
				userAddress: $ethAddress
			});

			setTokensWithFees(tokensWithFees);

			onNext();
		} catch (_: unknown) {
			error = $i18n.scanner.error.code_link_is_not_valid;
		} finally {
			busy.stop();
		}
	};

	const handleScan = async ({ status, code }: { status: QrStatus; code?: string }) => {
		if (status !== 'success' || isNullish(code)) {
			return;
		}
		await processCode(code);
	};

	const handleManualConnect = async () => {
		await processCode(uri);
	};

	$effect(() => {
		if (isEmptyUri) {
			error = '';
		}
	});
</script>

<ContentWithToolbar styleClass="flex flex-col gap-3 md:gap-4 w-full">
	<QrCodeScanner onScan={handleScan} />

	<Responsive up="md">
		<ScannerCodeInput
			name="uri"
			{error}
			label={$i18n.scanner.text.url_or_code}
			placeholder={$i18n.scanner.text.enter_or_paste_code}
			bind:value={uri}
		/>
	</Responsive>

	<Responsive down="sm">
		<BottomSheet contentClass="min-h-[10vh]" bind:visible={openBottomSheet}>
			{#snippet content()}
				<div class="mb-4">
					<ScannerCodeInput
						name="uri"
						{error}
						label={$i18n.scanner.text.url_or_code}
						placeholder={$i18n.scanner.text.enter_or_paste_code}
						bind:value={uri}
					/>
				</div>
			{/snippet}

			{#snippet footer()}
				<Button disabled={isEmptyUri} fullWidth onclick={handleManualConnect}
					>{$i18n.core.text.continue}</Button
				>
			{/snippet}
		</BottomSheet>
	</Responsive>

	{#snippet toolbar()}
		<Responsive up="md">
			<ButtonGroup>
				<Button disabled={isEmptyUri} onclick={handleManualConnect}
					>{$i18n.core.text.continue}</Button
				>
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
					testId={OPEN_CRYPTO_PAY_ENTER_MANUALLY_BUTTON}
				>
					{$i18n.scanner.text.enter_manually}
					<IconChain />
				</Button>
			</div>
		</Responsive>
	{/snippet}
</ContentWithToolbar>
