<script lang="ts">
	import { isEmptyString, isNullish, nonNullish, notEmptyString } from '@dfinity/utils';
	import { Principal } from '@icp-sdk/core/principal';
	import { getContext, onDestroy } from 'svelte';
	import { slide } from 'svelte/transition';
	import { enabledMainnetBitcoinToken } from '$btc/derived/tokens.derived';
	import { allUtxosStore } from '$btc/stores/all-utxos.store';
	import { btcPendingSentTransactionsStore } from '$btc/stores/btc-pending-sent-transactions.store';
	import { feeRatePercentilesStore } from '$btc/stores/fee-rate-percentiles.store';
	import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
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
	import { screensStore } from '$lib/stores/screens.store';
	import type { QrStatus } from '$lib/types/qr-code';
	import { ScannerResults } from '$lib/types/scanner';
	import { isMobile } from '$lib/utils/device.utils';
	import { prepareBasePayableTokens } from '$lib/utils/open-crypto-pay.utils';
	import { extractWalletConnectUri } from '$lib/utils/scanner.utils';
	import { AVAILABLE_SCREENS, filterScreens, MIN_SCREEN } from '$lib/utils/screens.utils';
	import { isInvalidDestinationBtc } from '$lib/utils/send.utils';
	import { waitReady } from '$lib/utils/timeout.utils';
	import { isSolAddress } from '$sol/utils/sol-address.utils';

	interface Props {
		onNext: (params: { results: ScannerResults; code?: string }) => void;
		onOpenInfo: () => void;
	}

	let { onNext, onOpenInfo }: Props = $props();

	const MOBILE_ERROR_BANNER_DURATION = 3500;

	let openBottomSheet = $state(false);
	let openInfoBottomSheet = $state(false);
	let uri = $state('');
	let error = $state('');
	let mobileError = $state('');
	let mobileErrorTimeout: ReturnType<typeof setTimeout> | undefined;
	let isEmptyUri = $derived(isEmptyString(uri));

	// Whether to render the address input inside a bottom sheet (with an "Enter
	// manually" trigger) instead of inline next to the camera. Requires both a
	// mobile device (touch-first ergonomics) and a viewport below `lg` (1024px):
	// the bottom sheet drops its sticky `position: fixed` styling at
	// >=1024px, so a wide-viewport mobile (dev-tools emulation, landscape
	// phablets, some Android tablets) would render the sheet inline in the
	// document flow and the trigger would appear broken — fall back to the
	// inline input in that case.
	//
	// Note: this is intentionally *not* the same predicate as the scanner
	// auto-start in QrCodeScanner.svelte, which uses `isMobile()` alone (no
	// viewport gate) because auto-starting the camera is a device-ergonomic
	// decision and the camera area has no layout constraint at >=lg.
	const BOTTOM_SHEET_INPUT_SCREENS = filterScreens({
		availableScreens: AVAILABLE_SCREENS,
		up: MIN_SCREEN,
		down: 'lg'
	});
	let useBottomSheetInput = $derived(
		isMobile() && BOTTOM_SHEET_INPUT_SCREENS.includes($screensStore)
	);

	const { setData, setAvailableTokens } = getContext<PayContext>(PAY_CONTEXT_KEY);

	const isIcPrincipal = (value: string): boolean => {
		try {
			Principal.fromText(value);
			return true;
		} catch (_: unknown) {
			return false;
		}
	};

	// Mobile surfaces errors as a transient banner, desktop as an inline input
	// error — the two are intentionally separate so the message never shows twice.
	const showError = (message: string) => {
		if (isMobile()) {
			mobileError = message;
			clearTimeout(mobileErrorTimeout);
			mobileErrorTimeout = setTimeout(() => {
				mobileError = '';
			}, MOBILE_ERROR_BANNER_DURATION);
		} else {
			error = message;
		}
	};

	const processCode = async (code: string) => {
		const walletConnect = extractWalletConnectUri(code);
		if (nonNullish(walletConnect)) {
			if (walletConnect.type === 'wrong-domain') {
				showError($i18n.scanner.error.link_domain_mismatch);
				return;
			}

			onNext({ results: ScannerResults.WALLET_CONNECT, code: walletConnect.uri });
			return;
		}

		const trimmed = code.trim();
		if (isSolAddress(trimmed)) {
			onNext({ results: ScannerResults.SOL_SEND, code: trimmed });
			return;
		}

		if (
			notEmptyString(trimmed) &&
			!isInvalidDestinationBtc({ destination: trimmed, networkId: BTC_MAINNET_NETWORK_ID })
		) {
			onNext({ results: ScannerResults.BTC_SEND, code: trimmed });
			return;
		}

		if (isIcPrincipal(trimmed)) {
			onNext({ results: ScannerResults.IC_SEND, code: trimmed });
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
			showError($i18n.scanner.error.code_link_is_not_valid);
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
			mobileError = '';
		}
	});

	onDestroy(() => clearTimeout(mobileErrorTimeout));
</script>

<div class="relative flex w-full flex-col bg-tertiary">
	<QrCodeScanner onScan={handleScan} universalScanner />

	{#if notEmptyString(mobileError)}
		<div
			class="absolute top-4 right-0 left-0 mx-auto w-[90%] rounded-lg border border-error-solid bg-error-subtle-10 p-3 text-center text-sm font-bold text-error-primary"
			aria-atomic="true"
			aria-live="assertive"
			role="alert"
			transition:slide={SLIDE_DURATION}
		>
			{mobileError}
		</div>
	{/if}

	{#if !useBottomSheetInput}
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
	{:else}
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
	{/if}

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
