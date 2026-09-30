import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
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
import { acceptProviderAgreement } from '$lib/services/provider-agreements.services';
import { fetchNearIntentsXrpSwap } from '$lib/services/swap.services';
import { SWAP_AMOUNTS_CONTEXT_KEY, initSwapAmountsStore } from '$lib/stores/swap-amounts.store';
import { SWAP_CONTEXT_KEY } from '$lib/stores/swap.store';
import * as toasts from '$lib/stores/toasts.store';
import { SwapProvider, type SwapMappedResult } from '$lib/types/swap';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockNearIntentsQuoteResponse } from '$tests/mocks/near-intents.mock';
import { mockXrpAddress } from '$tests/mocks/xrp.mock';
import SwapXrpWizard from '$xrp/components/swap/SwapXrpWizard.svelte';
import * as xrplRest from '$xrp/rest/xrpl.rest';
import { XrpNetworks } from '$xrp/types/network';
import {
	XrpAmountExceedsSendableError,
	XrpSendAlreadyInFlightError,
	XrpSendNotGuardedError
} from '$xrp/types/xrp-send';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { readable, writable } from 'svelte/store';

vi.mock('$lib/services/swap.services', () => ({
	fetchNearIntentsXrpSwap: vi.fn()
}));

vi.mock('$lib/services/provider-agreements.services', () => ({
	acceptProviderAgreement: vi.fn()
}));

describe('SwapXrpWizard', () => {
	const balance = 50_000_000n;
	const nodeFee = 12n;

	// 10 XRP at $2 against 0.01 ETH at $2000: no value difference for the review step to warn about,
	// which would otherwise hold the swap button behind a confirmation.
	const offer: SwapMappedResult = {
		provider: SwapProvider.NEAR_INTENTS,
		receiveAmount: 10_000_000_000_000_000n,
		swapDetails: mockNearIntentsQuoteResponse,
		type: undefined
	};

	const sourceToken = { ...XRP_TOKEN, enabled: true };
	const destinationToken = { ...ETHEREUM_TOKEN, enabled: true };

	const createContext = ({ sourceBalance = balance }: { sourceBalance?: bigint } = {}) => {
		const context = new Map();

		context.set(SWAP_CONTEXT_KEY, {
			sourceToken: readable(sourceToken),
			destinationToken: readable(destinationToken),
			failedSwapError: writable(undefined),
			sourceTokenExchangeRate: readable(2),
			sourceTokenBalance: readable(sourceBalance),
			destinationTokenBalance: readable(undefined),
			destinationTokenExchangeRate: readable(2000),
			isSourceTokenIcrc2: readable(false),
			isSourceTokenPermitSupported: readable(undefined),
			setIsTokenPermitSupported: vi.fn(),
			setSourceToken: () => {},
			setDestinationToken: () => {},
			switchTokens: () => {}
		});

		const swapAmountsStore = initSwapAmountsStore();
		swapAmountsStore.setSwaps({ swaps: [offer], amountForSwap: 10, selectedProvider: offer });
		context.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: swapAmountsStore });

		return context;
	};

	const callbacks = () => ({
		onShowTokensList: vi.fn(),
		onShowProviderList: vi.fn(),
		onClose: vi.fn(),
		onNext: vi.fn(),
		onBack: vi.fn(),
		onStartTriggerAmount: vi.fn(),
		onStopTriggerAmount: vi.fn()
	});

	const renderStep = ({
		step,
		swapAmount = '10',
		context = createContext()
	}: {
		step: WizardStepsSwap;
		swapAmount?: string;
		context?: Map<unknown, unknown>;
	}) => {
		const handlers = callbacks();

		const result = render(SwapXrpWizard, {
			props: {
				swapAmount,
				receiveAmount: 0.01,
				slippageValue: '0.5',
				swapProgressStep: ProgressStepsSwap.INITIALIZATION,
				isSwapAmountsLoading: false,
				currentStep: { name: step, title: 'Swap' },
				...handlers
			},
			context
		});

		return { ...result, ...handlers };
	};

	// The wizard owns the fee context and `XrpFeeContext` fills it from the two node calls. The
	// swap refuses while either figure is unknown, so a review has to settle before the click.
	const renderReviewSettled = async (
		params: { swapAmount?: string; context?: Map<unknown, unknown> } = {}
	) => {
		const rendered = renderStep({ step: WizardStepsSwap.REVIEW, ...params });

		await waitFor(() => {
			expect(xrplRest.loadXrpAccountInfo).toHaveBeenCalled();
			expect(rendered.getByText(en.fee.text.network_fee)).toBeInTheDocument();
		});

		await tick();

		return rendered;
	};

	const clickSwap = async (getByText: (text: string) => HTMLElement) => {
		await fireEvent.click(getByText(en.swap.text.swap_button));

		await tick();
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockAuthStore();

		vi.spyOn(addrDerived, 'xrpAddressMainnet', 'get').mockReturnValue(readable(mockXrpAddress));
		vi.spyOn(analytics, 'trackEvent').mockImplementation(() => undefined);
		vi.spyOn(toasts, 'toastsError').mockImplementation(() => Symbol('toast'));

		vi.spyOn(xrplRest, 'loadXrpOpenLedgerFee').mockResolvedValue(nodeFee);
		vi.spyOn(xrplRest, 'loadXrpAccountInfo').mockResolvedValue({
			balance,
			sequence: 7,
			ownerCount: 0,
			flags: 0
		});

		vi.mocked(fetchNearIntentsXrpSwap).mockResolvedValue(undefined);
		vi.mocked(acceptProviderAgreement).mockResolvedValue(undefined);
	});

	describe('rendering', () => {
		it('renders the form on the swap step', () => {
			const { getByText } = renderStep({ step: WizardStepsSwap.SWAP });

			expect(getByText(en.tokens.text.source_token_title)).toBeInTheDocument();
			expect(getByText(en.tokens.text.destination_token_title)).toBeInTheDocument();
			expect(getByText(en.swap.text.review_button)).toBeInTheDocument();
		});

		it('renders the network fee of the deposit on review', async () => {
			const { findByText } = renderStep({ step: WizardStepsSwap.REVIEW });

			await expect(findByText(en.fee.text.network_fee)).resolves.toBeInTheDocument();
		});

		// The acceptance itself happens inline on "Swap now"; the review step first has to present
		// the terms the click will accept.
		it('shows the ToS notice on review when the user has not acknowledged it yet', () => {
			const { container } = renderStep({ step: WizardStepsSwap.REVIEW });

			const tosText =
				new DOMParser().parseFromString(en.swap.text.near_intents_tos, 'text/html').body
					.textContent ?? '';

			expect(container.textContent).toContain(tosText);
		});

		// The deposit is tracked as an active user transaction, so the stepper says the swap starts
		// here and finishes in the background.
		it('renders the progress step with the background wording', () => {
			const { getByText } = renderStep({ step: WizardStepsSwap.SWAPPING });

			expect(getByText(en.swap.text.finishing_in_background)).toBeInTheDocument();
		});
	});

	describe('execution', () => {
		it('pays the deposit from the user own address with the reviewed fee', async () => {
			const { getByText } = await renderReviewSettled();

			await clickSwap(getByText);

			await waitFor(() => expect(fetchNearIntentsXrpSwap).toHaveBeenCalledOnce());

			expect(fetchNearIntentsXrpSwap).toHaveBeenCalledWith(
				expect.objectContaining({
					identity: mockIdentity,
					sourceToken,
					destinationToken,
					swapAmount: '10',
					swapDetails: mockNearIntentsQuoteResponse,
					userAddress: mockXrpAddress,
					network: XrpNetworks.mainnet,
					fee: nodeFee
				})
			);
		});

		it('accepts the provider agreement before moving funds', async () => {
			const { getByText } = await renderReviewSettled();

			await clickSwap(getByText);

			await waitFor(() => expect(fetchNearIntentsXrpSwap).toHaveBeenCalledOnce());

			const [acceptOrder] = vi.mocked(acceptProviderAgreement).mock.invocationCallOrder;
			const [swapOrder] = vi.mocked(fetchNearIntentsXrpSwap).mock.invocationCallOrder;

			expect(acceptOrder).toBeLessThan(swapOrder);
		});

		it('aborts without sending when the agreement cannot be persisted', async () => {
			vi.mocked(acceptProviderAgreement).mockRejectedValue(new Error('agreement save failed'));

			const { getByText, onBack, onStartTriggerAmount, onClose } = await renderReviewSettled();

			await clickSwap(getByText);

			await waitFor(() => expect(onBack).toHaveBeenCalledOnce());

			expect(fetchNearIntentsXrpSwap).not.toHaveBeenCalled();
			expect(onStartTriggerAmount).toHaveBeenCalledOnce();
			expect(onClose).not.toHaveBeenCalled();
			expect(toasts.toastsError).toHaveBeenCalledWith(
				expect.objectContaining({ msg: { text: en.swap.error.cannot_save_provider_agreement } })
			);
		});

		it('skips the agreement step when the user already acknowledged it', async () => {
			vi.spyOn(agreementsDerived, 'hasAcknowledgedNearIntentsSwap', 'get').mockReturnValue(
				readable(true)
			);

			const { getByText } = await renderReviewSettled();

			await clickSwap(getByText);

			await waitFor(() => expect(fetchNearIntentsXrpSwap).toHaveBeenCalledOnce());

			expect(acceptProviderAgreement).not.toHaveBeenCalled();
		});

		it('closes the modal and tracks a submitted event after the deposit', async () => {
			const { getByText, onClose, onBack } = await renderReviewSettled();

			await clickSwap(getByText);

			await waitFor(() => expect(onClose).toHaveBeenCalledOnce());

			expect(onBack).not.toHaveBeenCalled();
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
	});

	// Refused on Review, before `onNext`: nothing is signed, and one step back is the form.
	describe('before signing', () => {
		it('refuses an amount that does not leave the reserve and the fee', async () => {
			// 10 XRP plus the fee and the 1 XRP reserve do not fit in 10.5.
			const { getByText, onBack, onNext } = await renderReviewSettled({
				context: createContext({ sourceBalance: 10_500_000n })
			});

			await clickSwap(getByText);

			expect(toasts.toastsError).toHaveBeenCalledWith({
				msg: { text: en.send.assertion.insufficient_funds_for_reserve }
			});
			expect(onBack).toHaveBeenCalledOnce();
			expect(onNext).not.toHaveBeenCalled();
			expect(fetchNearIntentsXrpSwap).not.toHaveBeenCalled();
		});

		it('refuses a zero amount', async () => {
			const { getByText, onBack, onNext } = await renderReviewSettled({ swapAmount: '0' });

			await clickSwap(getByText);

			expect(toasts.toastsError).toHaveBeenCalledWith({
				msg: { text: en.send.assertion.amount_invalid }
			});
			expect(onBack).toHaveBeenCalledOnce();
			expect(onNext).not.toHaveBeenCalled();
			expect(fetchNearIntentsXrpSwap).not.toHaveBeenCalled();
		});

		// A missing figure is not a shortfall, so it stays on Review rather than sending the user to
		// lower an amount that may be fine.
		it('refuses while the reserve is unknown, staying on review', async () => {
			vi.spyOn(xrplRest, 'loadXrpAccountInfo').mockRejectedValue(new Error('tooBusy'));

			const { getByText, onBack, onNext } = await renderReviewSettled();

			await clickSwap(getByText);

			expect(toasts.toastsError).toHaveBeenCalledWith({
				msg: { text: en.send.error.xrp_account_state_unavailable }
			});
			expect(onBack).not.toHaveBeenCalled();
			expect(onNext).not.toHaveBeenCalled();
			expect(fetchNearIntentsXrpSwap).not.toHaveBeenCalled();
		});
	});

	// Thrown by `sendXrp` after `onNext`, before the broadcast: nothing left the wallet.
	describe('refusals from the deposit', () => {
		it.each([
			{
				name: 'an XRP payment from the address in flight',
				error: new XrpSendAlreadyInFlightError('in flight'),
				text: en.send.error.xrp_send_already_in_flight
			},
			{
				name: 'an in-flight check that could not run',
				error: new XrpSendNotGuardedError('not guarded'),
				text: en.send.error.xrp_send_not_guarded
			}
		])('goes back to review on $name', async ({ error, text }) => {
			vi.mocked(fetchNearIntentsXrpSwap).mockRejectedValue(error);

			const { getByText, onBack, onStartTriggerAmount, onClose } = await renderReviewSettled();

			await clickSwap(getByText);

			await waitFor(() => expect(onBack).toHaveBeenCalledOnce());

			expect(onStartTriggerAmount).toHaveBeenCalledOnce();
			expect(onClose).not.toHaveBeenCalled();
			expect(toasts.toastsError).toHaveBeenCalledWith({ msg: { text }, err: error });
		});

		// The message names the amount, which only the form can change, and the wizard is on SWAPPING.
		it('goes back to the form when the ledger no longer leaves room for the amount', async () => {
			const error = new XrpAmountExceedsSendableError('exceeds');

			vi.mocked(fetchNearIntentsXrpSwap).mockRejectedValue(error);

			const { getByText, onBack } = await renderReviewSettled();

			await clickSwap(getByText);

			await waitFor(() => expect(onBack).toHaveBeenCalledTimes(2));

			expect(toasts.toastsError).toHaveBeenCalledWith({
				msg: { text: en.send.error.xrp_amount_exceeds_sendable },
				err: error
			});
		});

		it('goes back and reports any other failure', async () => {
			const error = new Error('signer unavailable');

			vi.mocked(fetchNearIntentsXrpSwap).mockRejectedValue(error);

			const { getByText, onBack, onClose } = await renderReviewSettled();

			await clickSwap(getByText);

			await waitFor(() => expect(onBack).toHaveBeenCalledOnce());

			expect(onClose).not.toHaveBeenCalled();
			expect(toasts.toastsError).toHaveBeenCalledWith({
				msg: { text: en.swap.error.unexpected },
				err: error
			});
			expect(analytics.trackEvent).toHaveBeenCalledWith(
				expect.objectContaining({ name: TRACK_COUNT_SWAP_ERROR })
			);
		});
	});
});
