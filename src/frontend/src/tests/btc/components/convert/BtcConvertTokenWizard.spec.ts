import BtcConvertTokenWizard from '$btc/components/convert/BtcConvertTokenWizard.svelte';
import * as utxosFeeStore from '$btc/stores/utxos-fee.store';
import type { UtxosFee } from '$btc/types/btc-send';
import { convertNumberToSatoshis } from '$btc/utils/btc-send.utils';
import { BTC_MAINNET_TOKEN } from '$env/tokens.btc.env';
import { ETHEREUM_TOKEN, ICP_TOKEN } from '$env/tokens.env';
import { btcAddressStore } from '$icp/stores/btc.store';
import * as backendApi from '$lib/api/backend.api';
import * as signerApi from '$lib/api/signer.api';
import * as addressesStore from '$lib/derived/address.derived';
import * as authStore from '$lib/derived/auth.derived';
import { ProgressStepsConvert } from '$lib/enums/progress-steps';
import { WizardStepsConvert } from '$lib/enums/wizard-steps';
import { CONVERT_CONTEXT_KEY } from '$lib/stores/convert.store';
import type { Token } from '$lib/types/token';
import { mapToSignerBitcoinNetwork } from '$lib/utils/network.utils';
import { mockBtcAddress, mockUtxosFee } from '$tests/mocks/btc.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import type { Identity } from '@dfinity/agent';
import { assertNonNullish, toNullable } from '@dfinity/utils';
import { fireEvent, render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('BtcConvertTokenWizard', () => {
	const sendAmount = 0.001;
	const transactionId = 'txid';
	const pendingBtcTransactionResponse = true;
	const mockContext = (sourceToken: Token | undefined = BTC_MAINNET_TOKEN) =>
		new Map([
			[
				CONVERT_CONTEXT_KEY,
				{
					sourceToken: readable(sourceToken),
					destinationToken: readable(ICP_TOKEN)
				}
			]
		]);
	const props = {
		currentStep: {
			name: WizardStepsConvert.REVIEW,
			title: 'title'
		},
		convertProgressStep: ProgressStepsConvert.INITIALIZATION,
		sendAmount: sendAmount,
		receiveAmount: sendAmount
	};
	const mockSignerApi = () =>
		vi.spyOn(signerApi, 'sendBtc').mockResolvedValue({ txid: transactionId });
	const mockBackendApi = () =>
		vi
			.spyOn(backendApi, 'addPendingBtcTransaction')
			.mockResolvedValue(pendingBtcTransactionResponse);
	const mockAuthStore = (value: Identity | null = mockIdentity) =>
		vi.spyOn(authStore, 'authIdentity', 'get').mockImplementation(() => readable(value));
	const mockBtcAddressStore = (address: string | undefined = mockBtcAddress) => {
		btcAddressStore.set({
			tokenId: ICP_TOKEN.id,
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
	const mockUtxosFeeStore = (utxosFee?: UtxosFee) => {
		const store = utxosFeeStore.initUtxosFeeStore();

		vi.spyOn(utxosFeeStore, 'initUtxosFeeStore').mockImplementation(() => {
			store.setUtxosFee({ utxosFee });
			return store;
		});
	};
	const clickConvertButton = async (container: HTMLElement) => {
		const convertButtonSelector = '[data-tid="convert-review-button-next"]';
		const button: HTMLButtonElement | null = container.querySelector(convertButtonSelector);
		assertNonNullish(button, 'Button not found');
		await fireEvent.click(button);
	};

	beforeEach(() => {
		mockPage.reset();
	});

	it('should call sendBtc if all requirements are met', async () => {
		const btcSendApiSpy = mockSignerApi();
		const addPendingTransactionApiSpy = mockBackendApi();
		mockAuthStore();
		mockBtcAddressStore();
		mockAddressesStore();
		mockUtxosFeeStore(mockUtxosFee);

		const { container } = render(BtcConvertTokenWizard, {
			props,
			context: mockContext()
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
		mockUtxosFeeStore(mockUtxosFee);

		const { container } = render(BtcConvertTokenWizard, {
			props,
			context: mockContext()
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
		mockUtxosFeeStore(mockUtxosFee);

		const { container } = render(BtcConvertTokenWizard, {
			props,
			context: mockContext(ETHEREUM_TOKEN)
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
		mockUtxosFeeStore(mockUtxosFee);

		const { container } = render(BtcConvertTokenWizard, {
			props,
			context: mockContext()
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
		mockUtxosFeeStore(mockUtxosFee);

		const { container } = render(BtcConvertTokenWizard, {
			props: {
				...props,
				sendAmount: undefined
			},
			context: mockContext()
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
		mockUtxosFeeStore(undefined);

		const { container } = render(BtcConvertTokenWizard, {
			props,
			context: mockContext()
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
			context: mockContext()
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
			context: mockContext()
		});

		expect(container).toHaveTextContent(en.core.warning.do_not_close);
	});
});
