import BtcSendTokenWizard from '$btc/components/send/BtcSendTokenWizard.svelte';
import * as btcPendingSentTransactionsStore from '$btc/services/btc-pending-sent-transactions.services';
import * as btcUtxosService from '$btc/services/btc-utxos.service';
import {
	ALL_UTXOS_CONTEXT_KEY,
	initAllUtxosStore,
	type AllUtxosContext
} from '$btc/stores/all-utxos.store';
import {
	FEE_RATE_PERCENTILES_CONTEXT_KEY,
	initFeeRatePercentilesStore,
	type FeeRatePercentilesContext
} from '$btc/stores/fee-rate-percentiles.store';
import * as utxosFeeStore from '$btc/stores/utxos-fee.store';
import {
	UTXOS_FEE_CONTEXT_KEY,
	type UtxosFeeContext,
	type UtxosFeeStore
} from '$btc/stores/utxos-fee.store';
import type { UtxosFee } from '$btc/types/btc-send';
import { convertNumberToSatoshis } from '$btc/utils/btc-send.utils';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import * as bitcoinApi from '$icp/api/bitcoin.api';
import * as backendApi from '$lib/api/backend.api';
import * as signerApi from '$lib/api/signer.api';
import * as addressesStore from '$lib/derived/address.derived';
import { ProgressStepsSendBtc } from '$lib/enums/progress-steps';
import { WizardStepsSend } from '$lib/enums/wizard-steps';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import type { Token } from '$lib/types/token';
import { mapToSignerBitcoinNetwork } from '$lib/utils/network.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockBtcAddress, mockUtxosFee } from '$tests/mocks/btc.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { assertNonNullish, toNullable } from '@dfinity/utils';
import { fireEvent, render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('BtcSendTokenWizard', () => {
	const sendAmount = 0.001;
	const transactionId = 'txid';
	const pendingBtcTransactionResponse = true;

	const mockContext = ({
		token = BTC_MAINNET_TOKEN,
		mockUtxosFeeStore
	}: {
		token?: Token;
		mockUtxosFeeStore: UtxosFeeStore;
	}) =>
		new Map<symbol, SendContext | UtxosFeeContext | AllUtxosContext | FeeRatePercentilesContext>([
			[UTXOS_FEE_CONTEXT_KEY, { store: mockUtxosFeeStore }],
			[ALL_UTXOS_CONTEXT_KEY, { store: initAllUtxosStore() }],
			[FEE_RATE_PERCENTILES_CONTEXT_KEY, { store: initFeeRatePercentilesStore() }],
			[SEND_CONTEXT_KEY, initSendContext({ token })]
		]);

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

	const mockBtcPendingSentTransactionsStore = () =>
		vi
			.spyOn(btcPendingSentTransactionsStore, 'loadBtcPendingSentTransactions')
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
		mockBtcPendingSentTransactionsStore();

		vi.spyOn(btcUtxosService, 'prepareBtcSend').mockReturnValue({
			feeSatoshis: mockUtxosFee.feeSatoshis,
			utxos: mockUtxosFee.utxos
		});
		vi.spyOn(bitcoinApi, 'getUtxosQuery').mockResolvedValue({
			utxos: [],
			tip_block_hash: new Uint8Array(),
			tip_height: 100,
			next_page: []
		});
		vi.spyOn(btcUtxosService, 'getFeeRateFromPercentiles').mockResolvedValue(1000n);
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
