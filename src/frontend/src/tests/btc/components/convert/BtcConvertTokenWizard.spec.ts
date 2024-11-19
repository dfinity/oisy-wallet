import BtcConvertTokenWizard from '$btc/components/convert/BtcConvertTokenWizard.svelte';
import * as btcSendServices from '$btc/services/btc-send.services';
import * as utxosFeeStore from '$btc/stores/utxos-fee.store';
import type { UtxosFee } from '$btc/types/btc-send';
import { BTC_MAINNET_TOKEN } from '$env/tokens.btc.env';
import { ETHEREUM_TOKEN, ICP_TOKEN } from '$env/tokens.env';
import { btcAddressStore } from '$icp/stores/btc.store';
import * as addressesStore from '$lib/derived/address.derived';
import * as authStore from '$lib/derived/auth.derived';
import { ProgressStepsConvert } from '$lib/enums/progress-steps';
import { WizardStepsConvert } from '$lib/enums/wizard-steps';
import { CONVERT_CONTEXT_KEY } from '$lib/stores/convert.store';
import type { Token } from '$lib/types/token';
import { mockBtcAddress, mockUtxosFee } from '$tests/mocks/btc.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import type { Identity } from '@dfinity/agent';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('BtcConvertTokenWizard', () => {
	const sendAmount = 0.001;
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
	const mockBtcSendServices = () => vi.spyOn(btcSendServices, 'sendBtc').mockResolvedValue();
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
		const spy = mockBtcSendServices();
		mockAuthStore();
		mockBtcAddressStore();
		mockAddressesStore();
		mockUtxosFeeStore(mockUtxosFee);

		const { container } = render(BtcConvertTokenWizard, {
			props,
			context: mockContext()
		});

		await clickConvertButton(container);

		expect(spy).toHaveBeenCalledWith(
			// all params except "onProgress"
			expect.objectContaining({
				amount: sendAmount,
				destination: mockBtcAddress,
				identity: mockIdentity,
				network: BTC_MAINNET_TOKEN.network.env,
				source: mockBtcAddress,
				utxosFee: expect.objectContaining(mockUtxosFee)
			})
		);
		expect(spy).toHaveBeenCalledOnce();
	});

	it('should not call sendBtc if authIdentity is not defined', async () => {
		const spy = mockBtcSendServices();
		mockAuthStore(null);
		mockBtcAddressStore();
		mockAddressesStore();
		mockUtxosFeeStore(mockUtxosFee);

		const { container } = render(BtcConvertTokenWizard, {
			props,
			context: mockContext()
		});

		await clickConvertButton(container);

		expect(spy).not.toHaveBeenCalled();
	});

	it('should not call sendBtc if network is not BTC', async () => {
		const spy = mockBtcSendServices();
		mockAuthStore();
		mockAddressesStore();
		mockBtcAddressStore();
		mockUtxosFeeStore(mockUtxosFee);

		const { container } = render(BtcConvertTokenWizard, {
			props,
			context: mockContext(ETHEREUM_TOKEN)
		});

		await clickConvertButton(container);

		expect(spy).not.toHaveBeenCalled();
	});

	it('should not call sendBtc if destination address is not defined', async () => {
		const spy = mockBtcSendServices();
		mockAuthStore();
		mockAddressesStore();
		mockBtcAddressStore('');
		mockUtxosFeeStore(mockUtxosFee);

		const { container } = render(BtcConvertTokenWizard, {
			props,
			context: mockContext()
		});

		await clickConvertButton(container);

		expect(spy).not.toHaveBeenCalled();
	});

	it('should not call sendBtc if sendAmount is not defined', async () => {
		const spy = mockBtcSendServices();
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

		expect(spy).not.toHaveBeenCalled();
	});

	it('should not call sendBtc if utxos are not defined', async () => {
		const spy = mockBtcSendServices();
		mockAuthStore();
		mockAddressesStore();
		mockBtcAddressStore();
		mockUtxosFeeStore(undefined);

		const { container } = render(BtcConvertTokenWizard, {
			props,
			context: mockContext()
		});

		await clickConvertButton(container);

		expect(spy).not.toHaveBeenCalled();
	});
});
