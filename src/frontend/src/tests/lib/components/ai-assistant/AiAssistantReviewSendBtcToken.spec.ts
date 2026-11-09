import * as btcSendServices from '$btc/services/btc-send.services';
import * as btcUtxosApi from '$btc/services/btc-utxos.service';
import {
	UTXOS_FEE_CONTEXT_KEY,
	initUtxosFeeStore,
	type UtxosFeeContext
} from '$btc/stores/utxos-fee.store';
import { BtcBroadcastUnconfirmedError, type UtxosFee } from '$btc/types/btc-send';
import { convertNumberToSatoshis } from '$btc/utils/btc-send.utils';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { btcAddressStore } from '$icp/stores/btc.store';
import * as backendApi from '$lib/api/backend.api';
import * as signerApi from '$lib/api/signer.api';
import AiAssistantReviewSendBtcToken from '$lib/components/ai-assistant/AiAssistantReviewSendBtcToken.svelte';
import {
	AI_ASSISTANT_SEND_TOKENS_BUTTON,
	AI_ASSISTANT_SEND_TOKENS_SUCCESS_MESSAGE,
	AI_ASSISTANT_SEND_TOKENS_UNCLEAR_MESSAGE
} from '$lib/constants/test-ids.constants';
import { balancesStore } from '$lib/stores/balances.store';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import * as toastsStore from '$lib/stores/toasts.store';
import type { AddPendingTransactionOutcome } from '$lib/types/api';
import type { Token } from '$lib/types/token';
import { mapToSignerBitcoinNetwork } from '$lib/utils/network.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockBtcAddress, mockBtcP2SHAddress, mockUtxosFee } from '$tests/mocks/btc.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { toNullable } from '@dfinity/utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

describe('AiAssistantReviewSendBtcToken', () => {
	const sendAmount = 0.0001;
	const transactionId = 'txid';
	const pendingBtcTransactionResponse: AddPendingTransactionOutcome = { response: true };
	const mockContext = ({
		token = BTC_MAINNET_TOKEN,
		utxosFee
	}: {
		token?: Token;
		utxosFee?: UtxosFee;
	}) => {
		const utxosFeeStore = initUtxosFeeStore();
		utxosFeeStore.setUtxosFee({ utxosFee });

		return new Map<symbol, SendContext | UtxosFeeContext>([
			[SEND_CONTEXT_KEY, initSendContext({ token })],
			[UTXOS_FEE_CONTEXT_KEY, { store: utxosFeeStore }]
		]);
	};
	const props = {
		amount: sendAmount,
		destination: mockBtcAddress,
		source: mockBtcP2SHAddress,
		sendCompleted: false,
		sendEnabled: true,
		sendOutcomeUnclear: false,
		onSendCompleted: vi.fn(),
		onSendOutcomeUnclear: vi.fn()
	};
	const mockSignerApi = () =>
		vi.spyOn(signerApi, 'sendBtc').mockResolvedValue({ txid: transactionId });
	const mockPrepareBtcSendApi = () =>
		vi.spyOn(btcUtxosApi, 'prepareBtcSend').mockReturnValue(mockUtxosFee);
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
			context: mockContext({ utxosFee: mockUtxosFee })
		});

		expect(() => getByTestId(AI_ASSISTANT_SEND_TOKENS_BUTTON)).toThrow();
		expect(getByTestId(AI_ASSISTANT_SEND_TOKENS_SUCCESS_MESSAGE)).toBeInTheDocument();
	});

	it('should offer no second send once a send may have gone out', () => {
		const { getByTestId } = render(AiAssistantReviewSendBtcToken, {
			props: { ...props, sendOutcomeUnclear: true },
			context: mockContext({ utxosFee: mockUtxosFee })
		});

		expect(() => getByTestId(AI_ASSISTANT_SEND_TOKENS_BUTTON)).toThrow();
		expect(getByTestId(AI_ASSISTANT_SEND_TOKENS_UNCLEAR_MESSAGE)).toHaveTextContent(
			en.send.error.btc_transaction_unconfirmed
		);
	});

	it('should send through the backend, and record an unclear outcome', async () => {
		const err = new BtcBroadcastUnconfirmedError({ cause: new Error('timeout') });
		const sendBtcSpy = vi.spyOn(btcSendServices, 'sendBtc').mockRejectedValue(err);
		const toastsErrorSpy = vi.spyOn(toastsStore, 'toastsError').mockReturnValue(Symbol('toast'));
		mockAuthStore();
		mockBtcAddressStore();
		mockBalance();
		mockPrepareBtcSendApi();
		mockValidateBtcSend();

		const { getByTestId } = render(AiAssistantReviewSendBtcToken, {
			props,
			context: mockContext({ utxosFee: mockUtxosFee })
		});

		await fireEvent.click(getByTestId(AI_ASSISTANT_SEND_TOKENS_BUTTON));

		await waitFor(() => expect(props.onSendOutcomeUnclear).toHaveBeenCalledOnce());

		expect(sendBtcSpy).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({ viaBackend: true })
		);
		expect(toastsErrorSpy).toHaveBeenCalledExactlyOnceWith({
			msg: { text: en.send.error.btc_transaction_unconfirmed },
			err
		});
		expect(props.onSendCompleted).not.toHaveBeenCalled();
	});

	it('should call sendBtc if all requirements are met', async () => {
		const btcSendApiSpy = mockSignerApi();
		mockBackendApi();
		mockAuthStore();
		mockBtcAddressStore();
		mockBalance();
		mockPrepareBtcSendApi();
		const validateBtcSendSpy = mockValidateBtcSend();

		const { getByTestId } = render(AiAssistantReviewSendBtcToken, {
			props,
			context: mockContext({ utxosFee: mockUtxosFee })
		});

		await waitFor(async () => {
			const button = getByTestId(AI_ASSISTANT_SEND_TOKENS_BUTTON);

			await fireEvent.click(button);

			expect(validateBtcSendSpy).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ source: mockBtcP2SHAddress, utxosFee: mockUtxosFee })
			);
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
		});
	});

	it('should not call sendBtc if authIdentity is not defined', async () => {
		const btcSendApiSpy = mockSignerApi();
		mockBackendApi();
		mockBtcAddressStore();
		mockBalance();
		mockPrepareBtcSendApi();
		mockValidateBtcSend();

		const { getByTestId } = render(AiAssistantReviewSendBtcToken, {
			props,
			context: mockContext({ utxosFee: mockUtxosFee })
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
			context: mockContext({ token: ETHEREUM_TOKEN, utxosFee: mockUtxosFee })
		});

		const button = getByTestId(AI_ASSISTANT_SEND_TOKENS_BUTTON);

		await fireEvent.click(button);

		expect(btcSendApiSpy).not.toHaveBeenCalled();
	});

	it('should not call sendBtc if utxos are not available', async () => {
		const btcSendApiSpy = mockSignerApi();
		mockBackendApi();
		mockAuthStore();
		mockBtcAddressStore();
		mockBalance();
		mockPrepareBtcSendApi();
		mockValidateBtcSend();

		const { getByTestId } = render(AiAssistantReviewSendBtcToken, {
			props,
			context: mockContext({})
		});

		const button = getByTestId(AI_ASSISTANT_SEND_TOKENS_BUTTON);

		await fireEvent.click(button);

		expect(btcSendApiSpy).not.toHaveBeenCalled();
	});

	it('should not call sendBtc if destination address is not BTC', () => {
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
			context: mockContext({ utxosFee: mockUtxosFee })
		});

		const button = getByTestId(AI_ASSISTANT_SEND_TOKENS_BUTTON);

		expect(button).toHaveAttribute('disabled');
	});

	it('should not allow calling sendBtc if sendEnabled is false', () => {
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
			context: mockContext({ utxosFee: mockUtxosFee })
		});

		const button = getByTestId(AI_ASSISTANT_SEND_TOKENS_BUTTON);

		expect(button).toHaveAttribute('disabled');
	});
});
