import BtcConvertTokenWizard from '$btc/components/convert/BtcConvertTokenWizard.svelte';
import * as btcPendingSentTransactionsStore from '$btc/services/btc-pending-sent-transactions.services';
import * as btcUtxosApi from '$btc/services/btc-utxos.service';
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
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { btcAddressStore } from '$icp/stores/btc.store';
import * as backendApi from '$lib/api/backend.api';
import * as signerApi from '$lib/api/signer.api';
import * as addressesStore from '$lib/derived/address.derived';
import { ProgressStepsConvert } from '$lib/enums/progress-steps';
import { WizardStepsConvert } from '$lib/enums/wizard-steps';
import {
	CONVERT_CONTEXT_KEY,
	initConvertContext,
	type ConvertContext
} from '$lib/stores/convert.store';
import {
	TOKEN_ACTION_VALIDATION_ERRORS_CONTEXT_KEY,
	initTokenActionValidationErrorsContext,
	type TokenActionValidationErrorsContext
} from '$lib/stores/token-action-validation-errors.store';
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

vi.mock('$lib/services/auth.services', () => ({
	nullishSignOut: vi.fn()
}));

describe('BtcConvertTokenWizard', () => {
	const sendAmount = 0.001;
	const transactionId = 'txid';
	const pendingBtcTransactionResponse = true;
	const mockContext = ({
		sourceToken = BTC_MAINNET_TOKEN,
		mockUtxosFeeStore
	}: {
		sourceToken?: Token;
		mockUtxosFeeStore: UtxosFeeStore;
	}) =>
		new Map<symbol, ConvertContext | TokenActionValidationErrorsContext | UtxosFeeContext>([
			[UTXOS_FEE_CONTEXT_KEY, { store: mockUtxosFeeStore }],
			[CONVERT_CONTEXT_KEY, initConvertContext({ sourceToken, destinationToken: ICP_TOKEN })],
			[TOKEN_ACTION_VALIDATION_ERRORS_CONTEXT_KEY, initTokenActionValidationErrorsContext()]
		]);
	const onBack = vi.fn();
	const onClose = vi.fn();
	const onNext = vi.fn();
	const props = {
		currentStep: {
			name: WizardStepsConvert.REVIEW,
			title: 'title'
		},
		convertProgressStep: ProgressStepsConvert.INITIALIZATION,
		sendAmount,
		receiveAmount: sendAmount,
		onBack,
		onClose,
		onNext
	};
	const mockSignerApi = () =>
		vi.spyOn(signerApi, 'sendBtc').mockResolvedValue({ txid: transactionId });
	const mockprepareBtcSendApi = () =>
		vi.spyOn(btcUtxosApi, 'prepareBtcSend').mockResolvedValue({
			feeSatoshis: mockUtxosFee.feeSatoshis,
			utxos: mockUtxosFee.utxos
		});
	const mockBackendApi = () =>
		vi
			.spyOn(backendApi, 'addPendingBtcTransaction')
			.mockResolvedValue(pendingBtcTransactionResponse);
	const mockBtcAddressStore = (address: string | undefined = mockBtcAddress) => {
		btcAddressStore.set({
			id: ICP_TOKEN.id,
			data: {
				certified: true,
				data: address
			}
		});
	};
	const mockAddressesStore = () =>
		vi
			.spyOn(addressesStore, 'btcAddressMainnet', 'get')
			.mockImplementation(() => readable(mockBtcAddress));
	const mockBtcPendingSentTransactionsStore = () =>
		vi
			.spyOn(btcPendingSentTransactionsStore, 'loadBtcPendingSentTransactions')
			.mockResolvedValue({ success: true });
	const mockUtxosFeeStore = (utxosFee?: UtxosFee) => {
		const store = utxosFeeStore.initUtxosFeeStore();
		store.setUtxosFee({ utxosFee });
		return store;
	};
	const clickConvertButton = async (container: HTMLElement) => {
		const convertButtonSelector = '[data-tid="convert-review-button-next"]';
		const button: HTMLButtonElement | null = container.querySelector(convertButtonSelector);
		assertNonNullish(button, 'Button not found');
		await fireEvent.click(button);
	};

	beforeEach(() => {
		mockPage.reset();
		mockBtcPendingSentTransactionsStore();
		mockprepareBtcSendApi();
	});

	it('should call sendBtc if all requirements are met', async () => {
		const btcSendApiSpy = mockSignerApi();
		const addPendingTransactionApiSpy = mockBackendApi();
		mockAuthStore();
		mockBtcAddressStore();
		mockAddressesStore();

		const { container } = render(BtcConvertTokenWizard, {
			props,
			context: mockContext({ mockUtxosFeeStore: mockUtxosFeeStore(mockUtxosFee) })
		});

		await clickConvertButton(container);

		expect(btcSendApiSpy).toHaveBeenCalledWith({
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
		expect(btcSendApiSpy).toHaveBeenCalledOnce();
		expect(addPendingTransactionApiSpy).toHaveResolvedWith(pendingBtcTransactionResponse);
	});

	it('should not call sendBtc if authIdentity is not defined', async () => {
		const btcSendApiSpy = mockSignerApi();
		const addPendingTransactionApiSpy = mockBackendApi();
		mockAuthStore(null);
		mockBtcAddressStore();
		mockAddressesStore();

		const { container } = render(BtcConvertTokenWizard, {
			props,
			context: mockContext({ mockUtxosFeeStore: mockUtxosFeeStore(mockUtxosFee) })
		});

		await clickConvertButton(container);

		expect(btcSendApiSpy).not.toHaveBeenCalled();
		expect(addPendingTransactionApiSpy).not.toHaveBeenCalled();
	});

	it('should not call sendBtc if network is not BTC', async () => {
		const btcSendApiSpy = mockSignerApi();
		const addPendingTransactionApiSpy = mockBackendApi();
		mockAuthStore();
		mockAddressesStore();
		mockBtcAddressStore();

		const { container } = render(BtcConvertTokenWizard, {
			props,
			context: mockContext({
				sourceToken: ETHEREUM_TOKEN,
				mockUtxosFeeStore: mockUtxosFeeStore(mockUtxosFee)
			})
		});

		await clickConvertButton(container);

		expect(btcSendApiSpy).not.toHaveBeenCalled();
		expect(addPendingTransactionApiSpy).not.toHaveBeenCalled();
	});

	it('should not call sendBtc if destination address is not defined', async () => {
		const btcSendApiSpy = mockSignerApi();
		const addPendingTransactionApiSpy = mockBackendApi();
		mockAuthStore();
		mockAddressesStore();
		mockBtcAddressStore('');

		const { container } = render(BtcConvertTokenWizard, {
			props,
			context: mockContext({ mockUtxosFeeStore: mockUtxosFeeStore(mockUtxosFee) })
		});

		await clickConvertButton(container);

		expect(btcSendApiSpy).not.toHaveBeenCalled();
		expect(addPendingTransactionApiSpy).not.toHaveBeenCalled();
	});

	it('should not call sendBtc if sendAmount is not defined', async () => {
		const btcSendApiSpy = mockSignerApi();
		const addPendingTransactionApiSpy = mockBackendApi();
		mockAuthStore();
		mockAddressesStore();
		mockBtcAddressStore();

		const { container } = render(BtcConvertTokenWizard, {
			props: {
				...props,
				sendAmount: undefined
			},
			context: mockContext({ mockUtxosFeeStore: mockUtxosFeeStore(mockUtxosFee) })
		});

		await clickConvertButton(container);

		expect(btcSendApiSpy).not.toHaveBeenCalled();
		expect(addPendingTransactionApiSpy).not.toHaveBeenCalled();
	});

	it('should not call sendBtc if utxos are not defined', async () => {
		const btcSendApiSpy = mockSignerApi();
		const addPendingTransactionApiSpy = mockBackendApi();
		mockAuthStore();
		mockAddressesStore();
		mockBtcAddressStore();

		const { container } = render(BtcConvertTokenWizard, {
			props,
			context: mockContext({ mockUtxosFeeStore: mockUtxosFeeStore(undefined) })
		});

		await clickConvertButton(container);

		expect(btcSendApiSpy).not.toHaveBeenCalled();
		expect(addPendingTransactionApiSpy).not.toHaveBeenCalled();
	});

	it('should render convert form if currentStep is CONVERT', () => {
		const { getByTestId } = render(BtcConvertTokenWizard, {
			props: {
				...props,
				currentStep: {
					name: WizardStepsConvert.CONVERT,
					title: 'test'
				}
			},
			context: mockContext({ mockUtxosFeeStore: mockUtxosFeeStore(mockUtxosFee) })
		});

		expect(getByTestId('convert-form-button-next')).toBeInTheDocument();
	});

	it('should render convert progress if currentStep is CONVERTING', () => {
		const { container } = render(BtcConvertTokenWizard, {
			props: {
				...props,
				currentStep: {
					name: WizardStepsConvert.CONVERTING,
					title: 'test'
				}
			},
			context: mockContext({ mockUtxosFeeStore: mockUtxosFeeStore(mockUtxosFee) })
		});

		expect(container).toHaveTextContent(en.core.warning.do_not_close);
	});
});
