import * as btcSendServices from '$btc/services/btc-send.services';
import * as btcUtxosApi from '$btc/services/btc-utxos.service';
import { convertNumberToSatoshis } from '$btc/utils/btc-send.utils';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { btcAddressStore } from '$icp/stores/btc.store';
import * as backendApi from '$lib/api/backend.api';
import * as signerApi from '$lib/api/signer.api';
import AiAssistantReviewSendBtcToken from '$lib/components/ai-assistant/AiAssistantReviewSendBtcToken.svelte';
import {
	AI_ASSISTANT_SEND_TOKENS_BUTTON,
	AI_ASSISTANT_SEND_TOKENS_SUCCESS_MESSAGE
} from '$lib/constants/test-ids.constants';
import { balancesStore } from '$lib/stores/balances.store';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import { mapToSignerBitcoinNetwork } from '$lib/utils/network.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockBtcAddress, mockUtxosFee } from '$tests/mocks/btc.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { toNullable } from '@dfinity/utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

vi.mock('$lib/services/auth.services', () => ({
	nullishSignOut: vi.fn()
}));

describe('AiAssistantReviewSendBtcToken', () => {
	const sendAmount = 0.0001;
	const transactionId = 'txid';
	const pendingBtcTransactionResponse = true;
	const mockContext = (token = BTC_MAINNET_TOKEN) =>
		new Map<symbol, SendContext>([[SEND_CONTEXT_KEY, initSendContext({ token })]]);
	const props = {
		amount: sendAmount,
		destination: mockBtcAddress,
		sendCompleted: false,
		sendEnabled: true
	};
	const mockSignerApi = () =>
		vi.spyOn(signerApi, 'sendBtc').mockResolvedValue({ txid: transactionId });
	const mockPrepareBtcSendApi = () =>
		vi.spyOn(btcUtxosApi, 'prepareBtcSend').mockResolvedValue(mockUtxosFee);
	const mockBackendApi = () =>
		vi
			.spyOn(backendApi, 'addPendingBtcTransaction')
			.mockResolvedValue(pendingBtcTransactionResponse);
	const mockValidateBtcSend = () =>
		vi.spyOn(btcSendServices, 'validateBtcSend').mockResolvedValue();
	const mockBtcAddressStore = (address: string | undefined = mockBtcAddress) => {
		btcAddressStore.set({
			id: BTC_MAINNET_TOKEN.id,
			data: {
				certified: true,
				data: address
			}
		});
	};
	const mockBalance = (balance = 1000000000000n) => {
		balancesStore.set({
			id: BTC_MAINNET_TOKEN.id,
			data: { data: balance, certified: true }
		});
	};

	beforeEach(() => {
		mockPage.reset();
		vi.resetAllMocks();
	});

	it('should render the success message instead of button if sendCompleted is true', () => {
		const { getByTestId } = render(AiAssistantReviewSendBtcToken, {
			props: {
				...props,
				sendCompleted: true
			},
			context: mockContext()
		});

		expect(() => getByTestId(AI_ASSISTANT_SEND_TOKENS_BUTTON)).toThrow();
		expect(getByTestId(AI_ASSISTANT_SEND_TOKENS_SUCCESS_MESSAGE)).toBeInTheDocument();
	});

	it('should call sendBtc if all requirements are met', async () => {
		const btcSendApiSpy = mockSignerApi();
		mockBackendApi();
		mockAuthStore();
		mockBtcAddressStore();
		mockBalance();
		mockPrepareBtcSendApi();
		mockValidateBtcSend();

		const { getByTestId } = render(AiAssistantReviewSendBtcToken, {
			props,
			context: mockContext()
		});

		await waitFor(async () => {
			const button = getByTestId(AI_ASSISTANT_SEND_TOKENS_BUTTON);

			await fireEvent.click(button);

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
		});
	});

	it('should not call sendBtc if authIdentity is not defined', async () => {
		const btcSendApiSpy = mockSignerApi();
		mockBackendApi();
		mockAuthStore();
		mockBtcAddressStore();
		mockBalance();
		mockPrepareBtcSendApi();
		mockValidateBtcSend();

		const { getByTestId } = render(AiAssistantReviewSendBtcToken, {
			props,
			context: mockContext()
		});

		const button = getByTestId(AI_ASSISTANT_SEND_TOKENS_BUTTON);

		await fireEvent.click(button);

		expect(btcSendApiSpy).not.toHaveBeenCalled();
	});

	it('should not call sendBtc if network is not BTC', async () => {
		const btcSendApiSpy = mockSignerApi();
		mockBackendApi();
		mockAuthStore();
		mockBtcAddressStore();
		mockBalance();
		mockPrepareBtcSendApi();
		mockValidateBtcSend();

		const { getByTestId } = render(AiAssistantReviewSendBtcToken, {
			props,
			context: mockContext(ETHEREUM_TOKEN)
		});

		const button = getByTestId(AI_ASSISTANT_SEND_TOKENS_BUTTON);

		await fireEvent.click(button);

		expect(btcSendApiSpy).not.toHaveBeenCalled();
	});

	it('should not call sendBtc if destination address is not BTC', async () => {
		const btcSendApiSpy = mockSignerApi();
		mockBackendApi();
		mockAuthStore();
		mockBtcAddressStore();
		mockBalance();
		mockPrepareBtcSendApi();
		mockValidateBtcSend();

		const { getByTestId } = render(AiAssistantReviewSendBtcToken, {
			props: {
				...props,
				destination: mockEthAddress
			},
			context: mockContext()
		});

		const button = getByTestId(AI_ASSISTANT_SEND_TOKENS_BUTTON);

		await fireEvent.click(button);

		expect(btcSendApiSpy).not.toHaveBeenCalled();
	});

	it('should not call sendBtc if sendEnabled is false', async () => {
		const btcSendApiSpy = mockSignerApi();
		mockBackendApi();
		mockAuthStore();
		mockBtcAddressStore();
		mockBalance();
		mockPrepareBtcSendApi();
		mockValidateBtcSend();

		const { getByTestId } = render(AiAssistantReviewSendBtcToken, {
			props: {
				...props,
				sendEnabled: false
			},
			context: mockContext()
		});

		const button = getByTestId(AI_ASSISTANT_SEND_TOKENS_BUTTON);

		await fireEvent.click(button);

		expect(btcSendApiSpy).not.toHaveBeenCalled();
	});
});
