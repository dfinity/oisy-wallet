<script lang="ts">
	import { assertNever, isNullish, nonNullish } from '@dfinity/utils';
	import { setContext, untrack } from 'svelte';
	import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
	import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
	import { SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
	import OpenCryptoPayWizard from '$lib/components/open-crypto-pay/OpenCryptoPayWizard.svelte';
	import ScannerCode from '$lib/components/scanner/ScannerCode.svelte';
	import ScannerInfo from '$lib/components/scanner/ScannerInfo.svelte';
	import ScannerModalPayDataLoader from '$lib/components/scanner/ScannerModalPayDataLoader.svelte';
	import WizardModal from '$lib/components/ui/WizardModal.svelte';
	import WalletConnectSessionWizard from '$lib/components/wallet-connect/WalletConnectSessionWizard.svelte';
	import { scannerWizardSteps } from '$lib/config/scanner.config';
	import { modalUniversalScannerData } from '$lib/derived/modal.derived';
	import { PLAUSIBLE_EVENTS } from '$lib/enums/plausible';
	import { ProgressStepsPayment } from '$lib/enums/progress-steps';
	import { WizardStepsScanner } from '$lib/enums/wizard-steps';
	import { trackEvent } from '$lib/services/analytics.services';
	import { connectListener } from '$lib/services/wallet-connect.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import {
		initPayContext,
		PAY_CONTEXT_KEY,
		type PayContext
	} from '$lib/stores/open-crypto-pay.store';
	import { ScannerResults } from '$lib/types/scanner';
	import type { WizardStep, WizardSteps } from '$lib/types/wizard';
	import { getOpenCryptoPayBaseTrackingParams } from '$lib/utils/open-crypto-pay.utils';
	import { goToWizardStep } from '$lib/utils/wizard-modal.utils';

	let steps = $derived<WizardSteps<WizardStepsScanner>>(scannerWizardSteps({ i18n: $i18n }));

	let currentStep = $state<WizardStep<WizardStepsScanner> | undefined>();

	let modal: WizardModal<WizardStepsScanner> | undefined = $state();

	let payProgressStep = $state(ProgressStepsPayment.REQUEST_DETAILS);

	const { selectedToken, data: payData } = setContext<PayContext>(
		PAY_CONTEXT_KEY,
		initPayContext()
	);

	const onClose = () => {
		if (currentStep?.name === WizardStepsScanner.PAY) {
			trackEvent({
				name: PLAUSIBLE_EVENTS.PAY,
				metadata: {
					...getOpenCryptoPayBaseTrackingParams({
						token: $selectedToken,
						providerData: $payData
					}),
					result_status: 'cancel'
				}
			});
		}
		modalStore.close();
	};

	const goToStep = (stepName: WizardStepsScanner) => {
		if (isNullish(modal)) {
			return;
		}

		goToWizardStep({
			modal,
			steps,
			stepName
		});
	};

	const goToScanStep = () => goToStep(WizardStepsScanner.SCAN);

	const goToInfoStep = () => goToStep(WizardStepsScanner.OISY_SCANNER_INFO);

	const startWalletConnect = async (uri: string) => {
		goToStep(WizardStepsScanner.WALLET_CONNECT_REVIEW);

		const { result } = await connectListener({ uri, onSessionDeleteCallback: goToScanStep });

		if (result === 'error') {
			goToStep(WizardStepsScanner.SCAN);
		}
	};

	const onWalletConnectConnect = async (uri: string) => {
		await startWalletConnect(uri);
	};

	const onNext = async ({ results, code }: { results: ScannerResults; code?: string }) => {
		if (results === ScannerResults.PAY) {
			goToStep(WizardStepsScanner.PAY);

			return;
		}

		if (results === ScannerResults.WALLET_CONNECT) {
			if (isNullish(code)) {
				return;
			}

			await startWalletConnect(code);

			return;
		}

		if (results === ScannerResults.SOL_SEND) {
			if (isNullish(code)) {
				return;
			}

			modalStore.openSend({
				id: Symbol(),
				data: {
					destination: code,
					lockedNetworkIds: [SOLANA_MAINNET_NETWORK_ID]
				}
			});

			return;
		}

		if (results === ScannerResults.BTC_SEND) {
			if (isNullish(code)) {
				return;
			}

			modalStore.openSend({
				id: Symbol(),
				data: {
					destination: code,
					lockedNetworkIds: [BTC_MAINNET_NETWORK_ID]
				}
			});

			return;
		}

		if (results === ScannerResults.IC_SEND) {
			if (isNullish(code)) {
				return;
			}

			modalStore.openSend({
				id: Symbol(),
				data: {
					destination: code,
					lockedNetworkIds: [ICP_NETWORK_ID]
				}
			});

			return;
		}

		assertNever(results, `Unhandled scanner result: ${results}`);
	};

	// When WalletConnectSession opens the scanner with a WC URI (deep-link), navigate to WC review once the modal renders
	let walletConnectDeepLinkHandled = $state(false);

	$effect(() => {
		if (
			!walletConnectDeepLinkHandled &&
			nonNullish($modalUniversalScannerData?.walletConnectUri) &&
			nonNullish(modal)
		) {
			walletConnectDeepLinkHandled = true;

			const uri = $modalUniversalScannerData.walletConnectUri;

			untrack(() => startWalletConnect(uri));
		}
	});
</script>

<ScannerModalPayDataLoader>
	<div class="scanner-modal">
		<WizardModal
			bind:this={modal}
			disablePointerEvents={currentStep?.name === WizardStepsScanner.TOKENS_LIST}
			{onClose}
			{steps}
			bind:currentStep
		>
			{#snippet title()}
				{currentStep?.title}
			{/snippet}

			{#key currentStep?.name}
				{#if currentStep?.name === WizardStepsScanner.OISY_SCANNER_INFO}
					<ScannerInfo onButtonClick={goToScanStep} />
				{:else if currentStep?.name === WizardStepsScanner.SCAN}
					<ScannerCode {onNext} onOpenInfo={goToInfoStep} />
				{:else if currentStep?.name === WizardStepsScanner.PAY || currentStep?.name === WizardStepsScanner.TOKENS_LIST || currentStep?.name === WizardStepsScanner.PAYING || currentStep?.name === WizardStepsScanner.PAYMENT_FAILED || currentStep?.name === WizardStepsScanner.PAYMENT_CONFIRMED}
					<OpenCryptoPayWizard {currentStep} {modal} {steps} bind:payProgressStep />
				{:else if currentStep?.name === WizardStepsScanner.WALLET_CONNECT_CONNECT || currentStep?.name === WizardStepsScanner.WALLET_CONNECT_REVIEW}
					<WalletConnectSessionWizard {currentStep} onConnect={onWalletConnectConnect} />
				{/if}
			{/key}
		</WizardModal>
	</div>
</ScannerModalPayDataLoader>

<style lang="scss">
	.scanner-modal :global(.content) {
		--dialog-padding-x: 0px;
		--dialog-padding-y: 0px;
	}
</style>
