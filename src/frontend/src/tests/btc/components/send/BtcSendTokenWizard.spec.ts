import BtcSendTokenWizard from '$btc/components/send/BtcSendTokenWizard.svelte';
import * as btcPendingSentTransactionsServices from '$btc/services/btc-pending-sent-transactions.services';
import * as btcSendServices from '$btc/services/btc-send.services';
import * as btcUtxosService from '$btc/services/btc-utxos.service';
import { allUtxosStore } from '$btc/stores/all-utxos.store';
import { btcPendingSentTransactionsStore } from '$btc/stores/btc-pending-sent-transactions.store';
import { feeRatePercentilesStore } from '$btc/stores/fee-rate-percentiles.store';
import type { UtxosFeeStore } from '$btc/stores/utxos-fee.store';
import * as utxosFeeStore from '$btc/stores/utxos-fee.store';
import { BtcBroadcastUnconfirmedError, type UtxosFee } from '$btc/types/btc-send';
import { convertNumberToSatoshis } from '$btc/utils/btc-send.utils';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import * as bitcoinApi from '$icp/api/bitcoin.api';
import * as backendApi from '$lib/api/backend.api';
import * as signerApi from '$lib/api/signer.api';
import { BtcBroadcastTransactionCanisterError } from '$lib/canisters/errors';
import { SignerCanisterPaymentError } from '$lib/canisters/signer.errors';
import * as addressesStore from '$lib/derived/address.derived';
import { ProgressStepsSendBtc } from '$lib/enums/progress-steps';
import { WizardStepsSend } from '$lib/enums/wizard-steps';
import * as toastsStore from '$lib/stores/toasts.store';
import type { AddPendingTransactionOutcome } from '$lib/types/api';
import type { Token } from '$lib/types/token';
import { mapToSignerBitcoinNetwork } from '$lib/utils/network.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockBtcAddress, mockUtxosFee } from '$tests/mocks/btc.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { btcSendViaBackend } from '$tests/utils/btc-env.test-utils';
import { mockContextMap } from '$tests/utils/context.test-utils';
import { mockUtxosFeeContextEntry } from '$tests/utils/fee.context.test-utils';
import { mockSendContextEntry } from '$tests/utils/send.context.test-utils';
import { assertNonNullish, toNullable } from '@dfinity/utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('BtcSendTokenWizard', () => {
	const sendAmount = 0.001;
	const transactionId = 'txid';
	const pendingBtcTransactionResponse: AddPendingTransactionOutcome = { response: true };

	const mockContext = ({
		token = BTC_MAINNET_TOKEN,
		mockUtxosFeeStore
	}: {
		token?: Token;
		mockUtxosFeeStore: UtxosFeeStore;
	}) =>
		mockContextMap([mockUtxosFeeContextEntry(mockUtxosFeeStore), mockSendContextEntry({ token })]);

	const onBack = vi.fn();
	const onClose = vi.fn();
	const onNext = vi.fn();
	const onSendBack = vi.fn();
	const onTokensList = vi.fn();

	const props = {
		currentStep: {
			name: WizardStepsSend.REVIEW,
			title: 'title'
		},
		sendProgressStep: ProgressStepsSendBtc.INITIALIZATION,
		amount: sendAmount,
		destination: mockBtcAddress,
		onBack,
		onClose,
		onNext,
		onSendBack,
		onTokensList
	};

	const mockSignerApi = () =>
		vi.spyOn(signerApi, 'sendBtc').mockResolvedValue({ txid: transactionId });

	const mockBackendApi = () =>
		vi
			.spyOn(backendApi, 'addPendingBtcTransaction')
			.mockResolvedValue(pendingBtcTransactionResponse);

	const mockAddressesStore = () =>
		vi
			.spyOn(addressesStore, 'btcAddressMainnet', 'get')
			.mockImplementation(() => readable(mockBtcAddress));

	const mockLoadBtcPendingSentTransactions = () =>
		vi
			.spyOn(btcPendingSentTransactionsServices, 'loadBtcPendingSentTransactions')
			.mockResolvedValue({ success: true });

	const mockUtxosFeeStoreWithValue = (utxosFee?: UtxosFee) => {
		const store = utxosFeeStore.initUtxosFeeStore();
		store.setUtxosFee({ utxosFee });
		return store;
	};

	const clickSendButton = async (container: HTMLElement) => {
		const sendButtonSelector = '[data-tid="review-form-send-button"]';
		const button: HTMLButtonElement | null = container.querySelector(sendButtonSelector);
		assertNonNullish(button, 'Button not found');
		await fireEvent.click(button);
	};

	beforeEach(() => {
		vi.clearAllMocks();

		mockPage.reset();
		mockLoadBtcPendingSentTransactions();

		allUtxosStore.reset();
		feeRatePercentilesStore.reset();
		btcPendingSentTransactionsStore.reset();

		vi.spyOn(btcUtxosService, 'prepareBtcSend').mockReturnValue({
			feeSatoshis: mockUtxosFee.feeSatoshis,
			feeRateMiliSatoshisPerVByte: mockUtxosFee.feeRateMiliSatoshisPerVByte,
			utxos: mockUtxosFee.utxos
		});
		vi.spyOn(bitcoinApi, 'getUtxosQuery').mockResolvedValue({
			utxos: [],
			tip_block_hash: new Uint8Array(),
			tip_height: 100,
			next_page: []
		});
		vi.spyOn(btcUtxosService, 'getFeeRateFromPercentiles').mockResolvedValue(1000n);
		vi.spyOn(btcSendServices, 'validateBtcSend').mockResolvedValue(undefined);
	});

	it('should call sendBtc if all requirements are met', async () => {
		const btcSendApiSpy = mockSignerApi();
		const addPendingTransactionApiSpy = mockBackendApi();
		mockAuthStore();
		mockAddressesStore();

		const { container } = render(BtcSendTokenWizard, {
			props,
			context: mockContext({ mockUtxosFeeStore: mockUtxosFeeStoreWithValue(mockUtxosFee) })
		});

		await clickSendButton(container);

		expect(btcSendApiSpy).toHaveBeenCalledExactlyOnceWith({
			identity: mockIdentity,
			network: mapToSignerBitcoinNetwork({ network: BTC_MAINNET_TOKEN.network.env }),
			utxosToSpend: mockUtxosFee.utxos,
			feeSatoshis: toNullable(mockUtxosFee.feeSatoshis),
			outputs: [
				{
					destination_address: mockBtcAddress,
					sent_satoshis: convertNumberToSatoshis({ amount: sendAmount })
				}
			]
		});
		expect(addPendingTransactionApiSpy).toHaveResolvedWith(pendingBtcTransactionResponse);
	});

	describe('when the send fails', () => {
		const sendAndFail = async (err: unknown) => {
			vi.spyOn(btcSendServices, 'sendBtc').mockRejectedValue(err);
			const toastsErrorSpy = vi.spyOn(toastsStore, 'toastsError');
			mockAuthStore();
			mockAddressesStore();

			const { container } = render(BtcSendTokenWizard, {
				props,
				context: mockContext({ mockUtxosFeeStore: mockUtxosFeeStoreWithValue(mockUtxosFee) })
			});

			await clickSendButton(container);

			await waitFor(() => expect(toastsErrorSpy).toHaveBeenCalledOnce());

			return toastsErrorSpy;
		};

		// The inputs stay reserved, so another send would spend other coins and could pay twice.
		it('should close, not offer the form again, when the transaction may have gone out', async () => {
			const err = new BtcBroadcastUnconfirmedError({ cause: new Error('timeout') });

			const toastsErrorSpy = await sendAndFail(err);

			expect(toastsErrorSpy).toHaveBeenCalledExactlyOnceWith({
				msg: { text: en.send.error.btc_transaction_unconfirmed },
				err
			});
			expect(onClose).toHaveBeenCalledOnce();
			expect(onBack).not.toHaveBeenCalled();
		});

		it('should go back to the form with the locked-funds message for reserved UTXOs', async () => {
			const err = new BtcBroadcastTransactionCanisterError(
				{ UtxosAlreadyReserved: null },
				'reserved'
			);

			const toastsErrorSpy = await sendAndFail(err);

			expect(toastsErrorSpy).toHaveBeenCalledExactlyOnceWith({
				msg: { text: en.send.assertion.btc_utxo_locked },
				err
			});
			expect(onBack).toHaveBeenCalledOnce();
			expect(onClose).not.toHaveBeenCalled();
		});

		// Nothing was sent, and the message says what to do, so the toast carries no English detail.
		it('should go back to the form, saying how long to wait, after a rate-limited broadcast', async () => {
			const err = new BtcBroadcastTransactionCanisterError(
				{ RateLimited: { max_calls: 20, window_ns: 3_600_000_000_000n, caller: mockPrincipal } },
				'Rate limit exceeded. Maximum of 20 calls allowed every 3600 seconds.'
			);

			const toastsErrorSpy = await sendAndFail(err);

			expect(toastsErrorSpy).toHaveBeenCalledExactlyOnceWith({
				msg: { text: en.send.error.btc_send_rate_limited.replace('$duration', '1 hour') }
			});
			expect(onBack).toHaveBeenCalledOnce();
			expect(onClose).not.toHaveBeenCalled();
		});

		// Only on the backend path: a `btc_caller_send` can cost more than any renewed approval.
		it('should go back to the form, saying to sign in again, after a spent signing approval', async () => {
			btcSendViaBackend.enabled = true;

			const err = new SignerCanisterPaymentError({
				LedgerWithdrawFromError: {
					ledger: mockPrincipal,
					error: { InsufficientAllowance: { allowance: 10n } }
				}
			});

			const toastsErrorSpy = await sendAndFail(err);

			expect(toastsErrorSpy).toHaveBeenCalledExactlyOnceWith({
				msg: { text: en.send.error.btc_signing_allowance_spent }
			});
			expect(onBack).toHaveBeenCalledOnce();
			expect(onClose).not.toHaveBeenCalled();
		});

		it('should go back to the form with its own message for any other failure', async () => {
			const err = new BtcBroadcastTransactionCanisterError({ FeeTooLow: null }, 'fee');

			const toastsErrorSpy = await sendAndFail(err);

			expect(toastsErrorSpy).toHaveBeenCalledExactlyOnceWith({
				msg: { text: en.send.error.unexpected },
				err
			});
			expect(onBack).toHaveBeenCalledOnce();
			expect(onClose).not.toHaveBeenCalled();
		});
	});

	it('should not call sendBtc if authIdentity is not defined', async () => {
		const btcSendApiSpy = mockSignerApi();
		const addPendingTransactionApiSpy = mockBackendApi();
		mockAuthStore(null);
		mockAddressesStore();

		const { container } = render(BtcSendTokenWizard, {
			props,
			context: mockContext({ mockUtxosFeeStore: mockUtxosFeeStoreWithValue(mockUtxosFee) })
		});

		await clickSendButton(container);

		expect(btcSendApiSpy).not.toHaveBeenCalled();
		expect(addPendingTransactionApiSpy).not.toHaveBeenCalled();
	});

	it('should not call sendBtc if network is not BTC', async () => {
		const btcSendApiSpy = mockSignerApi();
		const addPendingTransactionApiSpy = mockBackendApi();
		mockAuthStore();
		mockAddressesStore();

		const { container } = render(BtcSendTokenWizard, {
			props,
			context: mockContext({
				token: ETHEREUM_TOKEN,
				mockUtxosFeeStore: mockUtxosFeeStoreWithValue(mockUtxosFee)
			})
		});

		await clickSendButton(container);

		expect(btcSendApiSpy).not.toHaveBeenCalled();
		expect(addPendingTransactionApiSpy).not.toHaveBeenCalled();
	});

	it('should not call sendBtc if destination address is not defined', async () => {
		const btcSendApiSpy = mockSignerApi();
		const addPendingTransactionApiSpy = mockBackendApi();
		mockAuthStore();
		mockAddressesStore();

		const { container } = render(BtcSendTokenWizard, {
			props: {
				...props,
				destination: ''
			},
			context: mockContext({ mockUtxosFeeStore: mockUtxosFeeStoreWithValue(mockUtxosFee) })
		});

		await clickSendButton(container);

		expect(btcSendApiSpy).not.toHaveBeenCalled();
		expect(addPendingTransactionApiSpy).not.toHaveBeenCalled();
	});

	it('should not call sendBtc if amount is not defined', async () => {
		const btcSendApiSpy = mockSignerApi();
		const addPendingTransactionApiSpy = mockBackendApi();
		mockAuthStore();
		mockAddressesStore();

		const { container } = render(BtcSendTokenWizard, {
			props: {
				...props,
				amount: undefined
			},
			context: mockContext({ mockUtxosFeeStore: mockUtxosFeeStoreWithValue(mockUtxosFee) })
		});

		await clickSendButton(container);

		expect(btcSendApiSpy).not.toHaveBeenCalled();
		expect(addPendingTransactionApiSpy).not.toHaveBeenCalled();
	});

	it('should not call sendBtc if utxos are not defined', async () => {
		const btcSendApiSpy = mockSignerApi();
		const addPendingTransactionApiSpy = mockBackendApi();
		mockAuthStore();
		mockAddressesStore();

		const { container } = render(BtcSendTokenWizard, {
			props,
			context: mockContext({ mockUtxosFeeStore: mockUtxosFeeStoreWithValue(undefined) })
		});

		await clickSendButton(container);

		expect(btcSendApiSpy).not.toHaveBeenCalled();
		expect(addPendingTransactionApiSpy).not.toHaveBeenCalled();
	});

	it('should render send form if currentStep is SEND', () => {
		const { getByTestId } = render(BtcSendTokenWizard, {
			props: {
				...props,
				currentStep: {
					name: WizardStepsSend.SEND,
					title: 'test'
				}
			},
			context: mockContext({ mockUtxosFeeStore: mockUtxosFeeStoreWithValue(mockUtxosFee) })
		});

		expect(getByTestId('send-form-next-button')).toBeInTheDocument();
	});

	it('should render send progress if currentStep is SENDING', () => {
		const { container } = render(BtcSendTokenWizard, {
			props: {
				...props,
				currentStep: {
					name: WizardStepsSend.SENDING,
					title: 'test'
				}
			},
			context: mockContext({ mockUtxosFeeStore: mockUtxosFeeStoreWithValue(mockUtxosFee) })
		});

		expect(container).toHaveTextContent(en.core.warning.do_not_close);
	});

	it('should render review form if currentStep is REVIEW', () => {
		const { container } = render(BtcSendTokenWizard, {
			props,
			context: mockContext({ mockUtxosFeeStore: mockUtxosFeeStoreWithValue(mockUtxosFee) })
		});

		expect(container).toHaveTextContent(en.send.text.send);
	});
});
