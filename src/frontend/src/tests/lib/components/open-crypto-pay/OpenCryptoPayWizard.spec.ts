import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import OpenCryptoPayWizard from '$lib/components/open-crypto-pay/OpenCryptoPayWizard.svelte';
import { scannerWizardSteps } from '$lib/config/scanner.config';
import { ProgressStepsPayment } from '$lib/enums/progress-steps';
import { WizardStepsScanner } from '$lib/enums/wizard-steps';
import { pay } from '$lib/services/open-crypto-pay.services';
import { PAY_CONTEXT_KEY } from '$lib/stores/open-crypto-pay.store';
import type {
	OpenCryptoPayResponse,
	PayableTokenWithConvertedAmount
} from '$lib/types/open-crypto-pay';
import type { WizardModal } from '$lib/types/wizard';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { writable } from 'svelte/store';

vi.mock('$lib/services/open-crypto-pay.services', () => ({
	pay: vi.fn()
}));

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

vi.mock('$eth/derived/tokens.derived', () => ({
	enabledEthereumTokens: {
		subscribe: vi.fn((callback) => {
			callback([]);
			return () => {};
		})
	}
}));

vi.mock('$evm/derived/tokens.derived', () => ({
	enabledEvmTokens: {
		subscribe: vi.fn((callback) => {
			callback([]);
			return () => {};
		})
	}
}));

vi.mock('$lib/derived/exchange.derived', () => ({
	exchanges: {
		subscribe: vi.fn((callback) => {
			callback({});
			return () => {};
		})
	}
}));

vi.mock('$lib/stores/balances.store', () => ({
	balancesStore: {
		subscribe: vi.fn((callback) => {
			callback({});
			return () => {};
		})
	}
}));

describe('OpenCryptoPayWizard', () => {
	const steps = scannerWizardSteps({ i18n: en });

	const stepIndex = (stepName: WizardStepsScanner): number =>
		steps.findIndex(({ name }) => name === stepName);

	const mockData: OpenCryptoPayResponse = {
		id: 'pl_test123',
		externalId: 'test-external',
		mode: 'Multiple',
		tag: 'payRequest',
		callback: 'https://api.dfx.swiss/v1/lnurlp/cb/pl_test123',
		minSendable: 1000,
		maxSendable: 10000,
		metadata: '[["text/plain", "Test"]]',
		displayName: 'Test Shop',
		standard: 'OpenCryptoPay',
		possibleStandards: ['OpenCryptoPay'],
		displayQr: true,
		quote: {
			id: 'quote123',
			expiration: '2025-12-31T23:59:59.000Z',
			payment: 'payment123'
		},
		requestedAmount: {
			asset: 'CHF',
			amount: '10'
		},
		transferAmounts: []
	};

	const mockToken = {
		...ETHEREUM_TOKEN,
		amount: '0.001',
		minFee: 0.001,
		tokenNetwork: 'Ethereum',
		amountInUSD: 3,
		feeInUSD: 1,
		sumInUSD: 4,
		fee: {
			feeInWei: 300n,
			feeData: {
				maxFeePerGas: 12n,
				maxPriorityFeePerGas: 7n
			},
			estimatedGasLimit: 25n
		}
	} as PayableTokenWithConvertedAmount;

	let modal: WizardModal<WizardStepsScanner>;

	const renderWizard = () =>
		render(OpenCryptoPayWizard, {
			props: {
				modal,
				steps,
				currentStep: steps[stepIndex(WizardStepsScanner.PAY)],
				payProgressStep: ProgressStepsPayment.REQUEST_DETAILS
			},
			context: new Map([
				[
					PAY_CONTEXT_KEY,
					{
						data: writable(mockData),
						selectedToken: writable(mockToken),
						availableTokens: writable([mockToken]),
						failedPaymentError: writable(undefined),
						reset: vi.fn()
					}
				]
			])
		});

	const clickPay = async () => {
		renderWizard();

		await fireEvent.click(screen.getByRole('button', { name: /^Pay/ }));
	};

	beforeEach(() => {
		vi.clearAllMocks();

		mockAuthStore();

		modal = { next: vi.fn(), back: vi.fn(), set: vi.fn() };
	});

	it('should go to the confirmation when the payment succeeds', async () => {
		vi.mocked(pay).mockImplementation(({ progress }) => {
			progress(ProgressStepsPayment.PAY);

			return Promise.resolve();
		});

		await clickPay();

		await waitFor(() =>
			expect(modal.set).toHaveBeenLastCalledWith(stepIndex(WizardStepsScanner.PAYMENT_CONFIRMED))
		);
	});

	it('should say the payment is not confirmed when it fails once it went to the provider', async () => {
		vi.mocked(pay).mockImplementation(({ progress }) => {
			progress(ProgressStepsPayment.SIGN_TRANSACTION);
			progress(ProgressStepsPayment.PAY);

			return Promise.reject(new Error('Load failed'));
		});

		await clickPay();

		await waitFor(() =>
			expect(modal.set).toHaveBeenLastCalledWith(
				stepIndex(WizardStepsScanner.PAYMENT_NOT_CONFIRMED)
			)
		);

		expect(modal.set).not.toHaveBeenCalledWith(stepIndex(WizardStepsScanner.PAYMENT_FAILED));
	});

	it('should say the payment failed when it fails before it is approved or signed', async () => {
		vi.mocked(pay).mockImplementation(({ progress }) => {
			progress(ProgressStepsPayment.SIGN_TRANSACTION);

			return Promise.reject(new Error('Signing failed'));
		});

		await clickPay();

		await waitFor(() =>
			expect(modal.set).toHaveBeenLastCalledWith(stepIndex(WizardStepsScanner.PAYMENT_FAILED))
		);
	});

	it('should say the payment failed when the payment details cannot be requested', async () => {
		vi.mocked(pay).mockRejectedValue(new Error('Fetching OpenCryptoPay failed.'));

		await clickPay();

		await waitFor(() =>
			expect(modal.set).toHaveBeenLastCalledWith(stepIndex(WizardStepsScanner.PAYMENT_FAILED))
		);
	});

	it('should show Close and no Try again on the not confirmed step', () => {
		render(OpenCryptoPayWizard, {
			props: {
				modal,
				steps,
				currentStep: steps[stepIndex(WizardStepsScanner.PAYMENT_NOT_CONFIRMED)],
				payProgressStep: ProgressStepsPayment.PAY
			},
			context: new Map([
				[
					PAY_CONTEXT_KEY,
					{
						data: writable(mockData),
						selectedToken: writable(mockToken),
						availableTokens: writable([mockToken]),
						failedPaymentError: writable('Load failed'),
						reset: vi.fn()
					}
				]
			])
		});

		expect(screen.getByText(en.core.text.close)).toBeInTheDocument();
		expect(screen.queryByText(en.scanner.text.try_again)).not.toBeInTheDocument();
	});
});
