<script lang="ts">
	import { isEmptyString, isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { slide } from 'svelte/transition';
	import { enabledMainnetBitcoinToken } from '$btc/derived/tokens.derived';
	import { allUtxosStore } from '$btc/stores/all-utxos.store';
	import { btcPendingSentTransactionsStore } from '$btc/stores/btc-pending-sent-transactions.store';
	import { feeRatePercentilesStore } from '$btc/stores/fee-rate-percentiles.store';
	import { OCP_PAY_WITH_BTC_ENABLED } from '$env/open-crypto-pay.env';
	import IconChain from '$lib/components/icons/IconChain.svelte';
	import QrCodeScanner from '$lib/components/qr/QrCodeScanner.svelte';
	import ScannerCodeInfoButton from '$lib/components/scanner/ScannerCodeInfoButton.svelte';
	import ScannerCodeInput from '$lib/components/scanner/ScannerCodeInput.svelte';
	import ScannerInfo from '$lib/components/scanner/ScannerInfo.svelte';
	import BottomSheet from '$lib/components/ui/BottomSheet.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import { OPEN_CRYPTO_PAY_ENTER_MANUALLY_BUTTON } from '$lib/constants/test-ids.constants';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { btcAddressMainnet } from '$lib/derived/address.derived';
	import { networksMainnets } from '$lib/derived/networks.derived';
	import { enabledTokens } from '$lib/derived/tokens.derived';
	import {
		calculateTokensWithFees,
		processOpenCryptoPayCode
	} from '$lib/services/open-crypto-pay.services';
	import { busy } from '$lib/stores/busy.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { PAY_CONTEXT_KEY, type PayContext } from '$lib/stores/open-crypto-pay.store';
	import type { QrStatus } from '$lib/types/qr-code';
	import { ScannerResults } from '$lib/types/scanner';
	import { isMobile } from '$lib/utils/device.utils';
	import { prepareBasePayableTokens } from '$lib/utils/open-crypto-pay.utils';
	import { waitReady } from '$lib/utils/timeout.utils';

	interface Props {
		onNext: (params: { results: ScannerResults; code?: string }) => void;
		onOpenInfo: () => void;
	}

	let { onNext, onOpenInfo }: Props = $props();

	const WALLET_CONNECT_URI_PREFIX = 'wc:';

	const MOBILE_ERROR_BANNER_DURATION = 3500;

	let openBottomSheet = $state(false);
	let openInfoBottomSheet = $state(false);
	let uri = $state('');
	let error = $state('');
	let showMobileError = $state(false);
	let mobileErrorTimeout: ReturnType<typeof setTimeout> | undefined;
	let isEmptyUri = $derived(isEmptyString(uri));

	const { setData, setAvailableTokens } = getContext<PayContext>(PAY_CONTEXT_KEY);

	const processCode = async (code: string) => {
		if (code.startsWith(WALLET_CONNECT_URI_PREFIX)) {
			onNext({ results: ScannerResults.WALLET_CONNECT, code });
			return;
		}

		busy.start();

		error = '';

		try {
			const isDisabled = (): boolean =>
				nonNullish($enabledMainnetBitcoinToken) &&
				nonNullish($btcAddressMainnet) &&
				(isNullish($btcPendingSentTransactionsStore[$btcAddressMainnet]) ||
					isNullish($allUtxosStore?.allUtxos) ||
					isNullish($feeRatePercentilesStore?.feeRateFromPercentiles));

			const [paymentData] = await Promise.all([
				processOpenCryptoPayCode(code),
				...(OCP_PAY_WITH_BTC_ENABLED ? [waitReady({ retries: 20, isDisabled })] : [])
			]);

			setData(paymentData);

			const baseTokens = prepareBasePayableTokens({
				transferAmounts: paymentData.transferAmounts,
				networks: $networksMainnets,
				availableTokens: $enabledTokens
			});

			const tokensWithFees = await calculateTokensWithFees(baseTokens);

			setAvailableTokens(tokensWithFees);

			onNext({ results: ScannerResults.PAY });
		} catch (_: unknown) {
			if (isMobile()) {
				showMobileError = true;
				clearTimeout(mobileErrorTimeout);
				mobileErrorTimeout = setTimeout(() => {
					showMobileError = false;
				}, MOBILE_ERROR_BANNER_DURATION);
			} else {
				error = $i18n.scanner.error.code_link_is_not_valid;
			}
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

<div class="relative flex w-full flex-col bg-tertiary">
	<QrCodeScanner onScan={handleScan} universalScanner />

	{#if showMobileError}
		<div
			class="absolute top-4 right-0 left-0 mx-auto w-[90%] rounded-lg border border-error-solid bg-error-subtle-10 p-3 text-center text-sm font-bold text-error-primary"
			transition:slide={SLIDE_DURATION}
		>
			{$i18n.scanner.error.code_link_is_not_valid}
		</div>
	{/if}

	<Responsive up="md">
		<ScannerCodeInput
			name="uri"
			{error}
			label={$i18n.scanner.text.url_or_code}
			placeholder={$i18n.scanner.text.enter_or_paste_code}
			styleClass="absolute right-0 bottom-[90px] left-0 mx-auto w-[90%] rounded-lg bg-surface"
			bind:value={uri}
		>
			<Button disabled={isEmptyUri} fullWidth onclick={handleManualConnect} paddingSmall>
				{$i18n.core.text.continue}
			</Button>
		</ScannerCodeInput>
	</Responsive>

	<Responsive down="sm">
		<BottomSheet contentClass="min-h-[10vh]" bind:visible={openBottomSheet}>
			{#snippet content()}
				<ScannerCodeInput
					name="uri"
					{error}
					label={$i18n.scanner.text.url_or_code}
					placeholder={$i18n.scanner.text.enter_or_paste_code}
					bind:value={uri}
				>
					<Button disabled={isEmptyUri} fullWidth onclick={handleManualConnect} paddingSmall>
						{$i18n.core.text.continue}
					</Button>
				</ScannerCodeInput>
			{/snippet}
		</BottomSheet>

		<div class="absolute right-0 bottom-[90px] left-0 mx-auto flex w-[200px] justify-center">
			<Button
				colorStyle="tertiary"
				innerStyleClass="flex items-center justify-center"
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

	<Responsive up="md">
		<ScannerCodeInfoButton onclick={onOpenInfo} />
	</Responsive>

	<Responsive down="sm">
		<ScannerCodeInfoButton onclick={() => (openInfoBottomSheet = true)} />

		<BottomSheet bind:visible={openInfoBottomSheet}>
			{#snippet content()}
				<ScannerInfo onButtonClick={() => (openInfoBottomSheet = false)} />
			{/snippet}
		</BottomSheet>
	</Responsive>
</div>
