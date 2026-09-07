import SwapBtcWizard from '$btc/components/swap/SwapBtcWizard.svelte';
import type * as btcSendServices from '$btc/services/btc-send.services';
import { validateBtcSend } from '$btc/services/btc-send.services';
import { UTXOS_FEE_CONTEXT_KEY, initUtxosFeeStore } from '$btc/stores/utxos-fee.store';
import {
	BtcPrepareSendError,
	BtcSendValidationError,
	BtcValidationError
} from '$btc/types/btc-send';
import { IC_CKBTC_LEDGER_CANISTER_ID } from '$env/tokens/tokens-icrc/tokens.icrc.ck.btc.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { btcAddressStore } from '$icp/stores/btc.store';
import {
	TRACK_COUNT_SWAP_ERROR,
	TRACK_COUNT_SWAP_SUBMITTED,
	TRACK_COUNT_SWAP_SUCCESS
} from '$lib/constants/analytics.constants';
import * as addrDerived from '$lib/derived/address.derived';
import * as agreementsDerived from '$lib/derived/user-provider-agreements.derived';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import { WizardStepsSwap } from '$lib/enums/wizard-steps';
import * as analytics from '$lib/services/analytics.services';
import { fetchChainFusionBtcSwap } from '$lib/services/chain-fusion-swap.services';
import { acceptProviderAgreement } from '$lib/services/provider-agreements.services';
import { fetchNearIntentsBtcSwap } from '$lib/services/swap.services';
import { SWAP_AMOUNTS_CONTEXT_KEY, initSwapAmountsStore } from '$lib/stores/swap-amounts.store';
import { SWAP_CONTEXT_KEY } from '$lib/stores/swap.store';
import * as toasts from '$lib/stores/toasts.store';
import { SwapProvider, type SwapMappedResult } from '$lib/types/swap';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockBtcAddress, mockUtxosFee } from '$tests/mocks/btc.mock';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcCkToken } from '$tests/mocks/ic-tokens.mock';
import { mockNearIntentsQuoteResponse } from '$tests/mocks/near-intents.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { readable, writable } from 'svelte/store';

vi.mock('$lib/services/chain-fusion-swap.services', () => ({
	fetchChainFusionBtcSwap: vi.fn()
}));

// `handleBtcValidationError` is left real: the point of these cases is that the mapping
// from error type to user-facing copy actually happens, which a stub would hide.
vi.mock('$btc/services/btc-send.services', async (importOriginal) => ({
	...(await importOriginal<typeof btcSendServices>()),
	validateBtcSend: vi.fn()
}));

vi.mock('$lib/services/swap.services', () => ({
	enableSwapDestinationToken: vi.fn(),
	fetchNearIntentsBtcSwap: vi.fn()
}));

vi.mock('$lib/services/provider-agreements.services', () => ({
	acceptProviderAgreement: vi.fn()
}));

// The loaders behind the UTXO fee are mounted above this wizard, by `SwapBtcContexts`; the
// context store is all the wizard itself reads, so the tests populate it directly.
describe('SwapBtcWizard', () => {
	const ckBtcToken = {
		...mockValidIcCkToken,
		id: parseTokenId('ckBTC-destination'),
		symbol: 'ckBTC',
		ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
		twinToken: BTC_MAINNET_TOKEN,
		enabled: true
	};

	const depositAddress = 'bc1qminterdepositaddressforthischainfusionswap0000';

	const chainFusionOffer: SwapMappedResult = {
		provider: SwapProvider.CHAIN_FUSION,
		// 0.01 at the ck token's 8 decimals, so the review step raises no value-difference
		// warning that would gate the swap button.
		receiveAmount: 1_000_000n,
		swapDetails: {
			sourceFees: [
				{ labelPath: 'fee.text.convert_btc_network_fee', fee: 1_000n, token: BTC_MAINNET_TOKEN }
			],
			externalFees: []
		}
	};

	const nearIntentsOffer: SwapMappedResult = {
		provider: SwapProvider.NEAR_INTENTS,
		receiveAmount: 1_000_000n,
		swapDetails: mockNearIntentsQuoteResponse,
		type: undefined
	};

	const baseProps = {
		swapAmount: '0.01',
		receiveAmount: 0.01,
		slippageValue: '0.5',
		swapProgressStep: ProgressStepsSwap.INITIALIZATION,
		isSwapAmountsLoading: false,
		onShowTokensList: vi.fn(),
		onShowProviderList: vi.fn(),
		onClose: vi.fn(),
		onNext: vi.fn(),
		onBack: vi.fn(),
		onStartTriggerAmount: vi.fn(),
		onStopTriggerAmount: vi.fn()
	};

	const createContext = (offer: SwapMappedResult = chainFusionOffer) => {
		const context = new Map();

		context.set(SWAP_CONTEXT_KEY, {
			sourceToken: readable({ ...BTC_MAINNET_TOKEN, enabled: true }),
			destinationToken: readable(ckBtcToken),
			failedSwapError: writable(undefined),
			sourceTokenExchangeRate: readable(60_000),
			sourceTokenBalance: readable(100_000_000n),
			destinationTokenBalance: readable(undefined),
			destinationTokenExchangeRate: readable(60_000),
			isSourceTokenIcrc2: readable(false),
			isSourceTokenPermitSupported: readable(undefined),
			setIsTokenPermitSupported: vi.fn(),
			setSourceToken: () => {},
			setDestinationToken: () => {},
			switchTokens: () => {}
		});

		const swapAmountsStore = initSwapAmountsStore();
		swapAmountsStore.setSwaps({
			swaps: [offer],
			amountForSwap: 0.01,
			selectedProvider: offer
		});
		context.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: swapAmountsStore });

		const utxosFeeStore = initUtxosFeeStore();
		utxosFeeStore.setUtxosFee({ utxosFee: mockUtxosFee, amountForFee: 0.01 });
		context.set(UTXOS_FEE_CONTEXT_KEY, { store: utxosFeeStore });

		return { context, utxosFeeStore };
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockAuthStore();

		btcAddressStore.reset(ckBtcToken.id);
		btcAddressStore.set({ id: ckBtcToken.id, data: { data: depositAddress, certified: true } });

		vi.spyOn(addrDerived, 'btcAddressMainnet', 'get').mockReturnValue(readable(mockBtcAddress));
		vi.spyOn(analytics, 'trackEvent').mockImplementation(() => undefined);
		vi.spyOn(toasts, 'toastsError').mockImplementation(() => Symbol('toast'));
	});

	describe('rendering', () => {
		it('renders the form on the swap step', () => {
			const { context } = createContext();

			const { getByText } = render(SwapBtcWizard, {
				props: { ...baseProps, currentStep: { name: WizardStepsSwap.SWAP, title: 'Swap' } },
				context
			});

			expect(getByText(en.tokens.text.source_token_title)).toBeInTheDocument();
			expect(getByText(en.tokens.text.destination_token_title)).toBeInTheDocument();
			expect(getByText(en.swap.text.review_button)).toBeInTheDocument();
		});

		// The offer prices a single fee, which stands as its own row rather than under a
		// "Total fee" header it would only repeat.
		it('renders the review step with the fee row', () => {
			const { context } = createContext();

			const { getByText, queryByText } = render(SwapBtcWizard, {
				props: { ...baseProps, currentStep: { name: WizardStepsSwap.REVIEW, title: 'Swap' } },
				context
			});

			expect(getByText(en.swap.text.swap_button)).toBeInTheDocument();
			expect(getByText(en.fee.text.convert_btc_network_fee)).toBeInTheDocument();
			expect(queryByText(en.swap.text.total_fee)).not.toBeInTheDocument();
		});

		it('renders the review step with the network fee for a NEAR Intents offer', () => {
			const { context } = createContext(nearIntentsOffer);

			const { getByText, queryByText } = render(SwapBtcWizard, {
				props: { ...baseProps, currentStep: { name: WizardStepsSwap.REVIEW, title: 'Swap' } },
				context
			});

			expect(getByText(en.fee.text.network_fee)).toBeInTheDocument();
			expect(queryByText(en.swap.text.total_fee)).not.toBeInTheDocument();
		});

		// The acceptance itself happens inline on "Swap now"; the review step first has to
		// present the terms the click will accept.
		it('shows the ToS notice on review when the user has not acknowledged it yet', () => {
			const { context } = createContext(nearIntentsOffer);

			const { container } = render(SwapBtcWizard, {
				props: { ...baseProps, currentStep: { name: WizardStepsSwap.REVIEW, title: 'Swap' } },
				context
			});

			// Derived from the i18n copy, parsed to its rendered text, so copy-only edits
			// cannot break this.
			const tosText =
				new DOMParser().parseFromString(en.swap.text.near_intents_tos, 'text/html').body
					.textContent ?? '';

			expect(container.textContent).toContain(tosText);
		});

		// The minting is tracked as an active user transaction, so the stepper says the swap
		// starts here and finishes in the background.
		it('renders the progress step with the background wording', () => {
			const { context } = createContext();

			const { getByText, queryByText } = render(SwapBtcWizard, {
				props: { ...baseProps, currentStep: { name: WizardStepsSwap.SWAPPING, title: 'Swap' } },
				context
			});

			expect(getByText(en.swap.text.finishing_in_background)).toBeInTheDocument();
			expect(queryByText(en.swap.text.swapping)).not.toBeInTheDocument();
		});
	});

	describe('execution', () => {
		beforeEach(() => {
			vi.useFakeTimers();
			vi.mocked(validateBtcSend).mockResolvedValue(undefined);
			vi.mocked(fetchChainFusionBtcSwap).mockResolvedValue(undefined);
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		const renderExecution = () => {
			const onClose = vi.fn();
			const onBack = vi.fn();
			const onStartTriggerAmount = vi.fn();

			const { context } = createContext();

			const result = render(SwapBtcWizard, {
				props: {
					...baseProps,
					currentStep: { name: WizardStepsSwap.REVIEW, title: 'Swap' },
					onClose,
					onBack,
					onStartTriggerAmount
				},
				context
			});

			return { ...result, onClose, onBack, onStartTriggerAmount };
		};

		it('sends the deposit to the minter address on the quoted selection', async () => {
			const { getByText } = renderExecution();

			await fireEvent.click(getByText(en.swap.text.swap_button));
			await vi.runOnlyPendingTimersAsync();

			expect(fetchChainFusionBtcSwap).toHaveBeenCalledWith(
				expect.objectContaining({
					amount: '0.01',
					source: mockBtcAddress,
					depositAddress,
					network: 'mainnet',
					utxosFee: mockUtxosFee,
					// Re-resolved through the pair oracle, so the row cannot disagree with the offer
					// about which twin — and which minter — this is.
					destinationToken: ckBtcToken,
					swapId: expect.any(String)
				})
			);
		});

		it('closes the modal after a successful deposit', async () => {
			const { getByText, onClose, onBack } = renderExecution();

			await fireEvent.click(getByText(en.swap.text.swap_button));
			await vi.runOnlyPendingTimersAsync();

			expect(onClose).toHaveBeenCalledOnce();
			expect(onBack).not.toHaveBeenCalled();
		});

		// The active-user-transaction row reports the mint's own success or failure when the
		// minter settles, so the foreground only reports what it did: broadcast the deposit.
		it('tracks a submitted event rather than a success one', async () => {
			const { getByText } = renderExecution();

			await fireEvent.click(getByText(en.swap.text.swap_button));
			await vi.runOnlyPendingTimersAsync();

			expect(analytics.trackEvent).toHaveBeenCalledWith(
				expect.objectContaining({ name: TRACK_COUNT_SWAP_SUBMITTED })
			);
			expect(analytics.trackEvent).not.toHaveBeenCalledWith(
				expect.objectContaining({ name: TRACK_COUNT_SWAP_SUCCESS })
			);
		});

		// Last-line guard against another tab having reserved one of the selected UTXOs.
		it('validates the selection before broadcasting', async () => {
			const { getByText } = renderExecution();

			await fireEvent.click(getByText(en.swap.text.swap_button));
			await vi.runOnlyPendingTimersAsync();

			expect(validateBtcSend).toHaveBeenCalledOnce();
		});

		it('goes back without sending when the selection no longer validates', async () => {
			vi.mocked(validateBtcSend).mockRejectedValue(BtcPrepareSendError.UtxoLocked);

			const { getByText, onBack, onStartTriggerAmount } = renderExecution();

			await fireEvent.click(getByText(en.swap.text.swap_button));
			await vi.runOnlyPendingTimersAsync();

			expect(fetchChainFusionBtcSwap).not.toHaveBeenCalled();
			expect(onBack).toHaveBeenCalledOnce();
			expect(onStartTriggerAmount).toHaveBeenCalledOnce();
		});

		// Silence here reads as a dead Review button: the quote refetches seconds later and
		// drops the offer, so the user never learns a pending send holds their inputs.
		it('names the reason when a pending transaction holds the selected inputs', async () => {
			vi.mocked(validateBtcSend).mockRejectedValue(
				new BtcValidationError(BtcSendValidationError.UtxoLocked)
			);

			const { getByText } = renderExecution();

			await fireEvent.click(getByText(en.swap.text.swap_button));
			await vi.runOnlyPendingTimersAsync();

			expect(toasts.toastsError).toHaveBeenCalledWith(
				expect.objectContaining({ msg: { text: en.send.assertion.btc_utxo_locked } })
			);
		});

		it('falls back to a generic message for a non-validation failure', async () => {
			vi.mocked(validateBtcSend).mockRejectedValue(new Error('minter unreachable'));

			const { getByText } = renderExecution();

			await fireEvent.click(getByText(en.swap.text.swap_button));
			await vi.runOnlyPendingTimersAsync();

			expect(toasts.toastsError).toHaveBeenCalledWith(
				expect.objectContaining({ msg: { text: en.swap.error.unexpected } })
			);
		});

		it('goes back and reports the error when the deposit fails', async () => {
			vi.mocked(fetchChainFusionBtcSwap).mockRejectedValue(new Error('signer unavailable'));

			const { getByText, onBack, onClose } = renderExecution();

			await fireEvent.click(getByText(en.swap.text.swap_button));
			await vi.runOnlyPendingTimersAsync();

			expect(onBack).toHaveBeenCalledOnce();
			expect(onClose).not.toHaveBeenCalled();
			expect(toasts.toastsError).toHaveBeenCalled();
			expect(analytics.trackEvent).toHaveBeenCalledWith(
				expect.objectContaining({ name: TRACK_COUNT_SWAP_ERROR })
			);
		});

		it('refuses to send when the minter deposit address is unknown', async () => {
			btcAddressStore.reset(ckBtcToken.id);

			const { getByText } = renderExecution();

			await fireEvent.click(getByText(en.swap.text.swap_button));
			await vi.runOnlyPendingTimersAsync();

			expect(fetchChainFusionBtcSwap).not.toHaveBeenCalled();
			expect(toasts.toastsError).toHaveBeenCalledWith(
				expect.objectContaining({ msg: { text: en.swap.error.unexpected_missing_data } })
			);
		});

		// Only the NEAR Intents provider moves funds through a third party; a Chain Fusion
		// swap stays within the user's own minter accounts, so no agreement applies.
		it('neither requires the provider agreement nor calls the NEAR Intents path', async () => {
			const { getByText } = renderExecution();

			await fireEvent.click(getByText(en.swap.text.swap_button));
			await vi.runOnlyPendingTimersAsync();

			expect(fetchChainFusionBtcSwap).toHaveBeenCalledOnce();
			expect(acceptProviderAgreement).not.toHaveBeenCalled();
			expect(fetchNearIntentsBtcSwap).not.toHaveBeenCalled();
		});
	});

	describe('NEAR Intents execution', () => {
		beforeEach(() => {
			vi.useFakeTimers();
			vi.mocked(validateBtcSend).mockResolvedValue(undefined);
			vi.mocked(fetchNearIntentsBtcSwap).mockResolvedValue(undefined);
			vi.mocked(acceptProviderAgreement).mockResolvedValue(undefined);
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		const renderExecution = () => {
			const onClose = vi.fn();
			const onBack = vi.fn();
			const onStartTriggerAmount = vi.fn();

			const { context } = createContext(nearIntentsOffer);

			const result = render(SwapBtcWizard, {
				props: {
					...baseProps,
					currentStep: { name: WizardStepsSwap.REVIEW, title: 'Swap' },
					onClose,
					onBack,
					onStartTriggerAmount
				},
				context
			});

			return { ...result, onClose, onBack, onStartTriggerAmount };
		};

		it('accepts the provider agreement before moving funds', async () => {
			const { getByText } = renderExecution();

			await fireEvent.click(getByText(en.swap.text.swap_button));
			await vi.runOnlyPendingTimersAsync();

			expect(acceptProviderAgreement).toHaveBeenCalledOnce();
			expect(fetchNearIntentsBtcSwap).toHaveBeenCalledOnce();

			const [acceptOrder] = vi.mocked(acceptProviderAgreement).mock.invocationCallOrder;
			const [swapOrder] = vi.mocked(fetchNearIntentsBtcSwap).mock.invocationCallOrder;

			expect(acceptOrder).toBeLessThan(swapOrder);
		});

		it('aborts without sending when the agreement cannot be persisted', async () => {
			vi.mocked(acceptProviderAgreement).mockRejectedValue(new Error('agreement save failed'));

			const { getByText, onBack, onClose, onStartTriggerAmount } = renderExecution();

			await fireEvent.click(getByText(en.swap.text.swap_button));
			await vi.runOnlyPendingTimersAsync();

			expect(fetchNearIntentsBtcSwap).not.toHaveBeenCalled();
			expect(onBack).toHaveBeenCalledOnce();
			expect(onStartTriggerAmount).toHaveBeenCalledOnce();
			expect(onClose).not.toHaveBeenCalled();
			expect(toasts.toastsError).toHaveBeenCalledWith(
				expect.objectContaining({ msg: { text: en.swap.error.cannot_save_provider_agreement } })
			);
		});

		it('skips the agreement step when the user already acknowledged it', async () => {
			const acknowledgedSpy = vi
				.spyOn(agreementsDerived, 'hasAcknowledgedNearIntentsSwap', 'get')
				.mockReturnValue(readable(true));

			const { getByText } = renderExecution();

			await fireEvent.click(getByText(en.swap.text.swap_button));
			await vi.runOnlyPendingTimersAsync();

			expect(acceptProviderAgreement).not.toHaveBeenCalled();
			expect(fetchNearIntentsBtcSwap).toHaveBeenCalledOnce();

			acknowledgedSpy.mockRestore();
		});

		it('sends the deposit with the quoted details and the user own address', async () => {
			const { getByText } = renderExecution();

			await fireEvent.click(getByText(en.swap.text.swap_button));
			await vi.runOnlyPendingTimersAsync();

			expect(fetchNearIntentsBtcSwap).toHaveBeenCalledWith(
				expect.objectContaining({
					swapAmount: '0.01',
					userAddress: mockBtcAddress,
					network: 'mainnet',
					utxosFee: mockUtxosFee,
					swapDetails: mockNearIntentsQuoteResponse,
					// The actual destination token, not a ck twin: NEAR Intents settles on the
					// destination chain directly.
					destinationToken: ckBtcToken
				})
			);
			expect(fetchChainFusionBtcSwap).not.toHaveBeenCalled();
		});

		// The UTXO race guard applies to any BTC send, whichever provider receives it.
		it('validates the selection before broadcasting', async () => {
			const { getByText } = renderExecution();

			await fireEvent.click(getByText(en.swap.text.swap_button));
			await vi.runOnlyPendingTimersAsync();

			expect(validateBtcSend).toHaveBeenCalledOnce();
		});

		it('goes back without sending when the selection no longer validates', async () => {
			vi.mocked(validateBtcSend).mockRejectedValue(BtcPrepareSendError.UtxoLocked);

			const { getByText, onBack, onStartTriggerAmount } = renderExecution();

			await fireEvent.click(getByText(en.swap.text.swap_button));
			await vi.runOnlyPendingTimersAsync();

			expect(fetchNearIntentsBtcSwap).not.toHaveBeenCalled();
			expect(onBack).toHaveBeenCalledOnce();
			expect(onStartTriggerAmount).toHaveBeenCalledOnce();
		});

		it('closes the modal after a successful deposit', async () => {
			const { getByText, onClose, onBack } = renderExecution();

			await fireEvent.click(getByText(en.swap.text.swap_button));
			await vi.runOnlyPendingTimersAsync();

			expect(onClose).toHaveBeenCalledOnce();
			expect(onBack).not.toHaveBeenCalled();
		});

		// Settlement is long-running and tracked by the active-user-transaction row, so the
		// foreground only ever reports the submission.
		it('tracks a submitted event rather than a success one', async () => {
			const { getByText } = renderExecution();

			await fireEvent.click(getByText(en.swap.text.swap_button));
			await vi.runOnlyPendingTimersAsync();

			expect(analytics.trackEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					name: TRACK_COUNT_SWAP_SUBMITTED,
					metadata: expect.objectContaining({ dApp: SwapProvider.NEAR_INTENTS })
				})
			);
			expect(analytics.trackEvent).not.toHaveBeenCalledWith(
				expect.objectContaining({ name: TRACK_COUNT_SWAP_SUCCESS })
			);
		});

		it('goes back and reports the error when the deposit fails', async () => {
			vi.mocked(fetchNearIntentsBtcSwap).mockRejectedValue(new Error('signer unavailable'));

			const { getByText, onBack, onClose } = renderExecution();

			await fireEvent.click(getByText(en.swap.text.swap_button));
			await vi.runOnlyPendingTimersAsync();

			expect(onBack).toHaveBeenCalledOnce();
			expect(onClose).not.toHaveBeenCalled();
			expect(toasts.toastsError).toHaveBeenCalledWith(
				expect.objectContaining({ msg: { text: en.swap.error.unexpected } })
			);
			expect(analytics.trackEvent).toHaveBeenCalledWith(
				expect.objectContaining({ name: TRACK_COUNT_SWAP_ERROR })
			);
		});
	});
});
