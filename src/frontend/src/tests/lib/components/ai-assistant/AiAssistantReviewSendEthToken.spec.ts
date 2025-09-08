import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ETHEREUM_TOKEN, ETHEREUM_TOKEN_ID, SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import * as sendServices from '$eth/services/send.services';
import * as ethFeeStore from '$eth/stores/eth-fee.store';
import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
import AiAssistantReviewSendEthToken from '$lib/components/ai-assistant/AiAssistantReviewSendEthToken.svelte';
import {
	AI_ASSISTANT_SEND_TOKENS_BUTTON,
	AI_ASSISTANT_SEND_TOKENS_SUCCESS_MESSAGE
} from '$lib/constants/test-ids.constants';
import { ethAddressStore } from '$lib/stores/address.store';
import { balancesStore } from '$lib/stores/balances.store';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import type { OptionEthAddress } from '$lib/types/address';
import { parseToken } from '$lib/utils/parse.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockCkMinterInfo } from '$tests/mocks/ck-minter.mock';
import { mockEthAddress, mockEthAddress3 } from '$tests/mocks/eth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { isNullish } from '@dfinity/utils';
import { fireEvent, render } from '@testing-library/svelte';
import type { MockInstance } from 'vitest';

vi.mock('$lib/services/auth.services', () => ({
	nullishSignOut: vi.fn()
}));

describe('AiAssistantReviewSendEthToken', () => {
	const sendAmount = 0.001;
	const mockFees = {
		gas: 100n,
		maxFeePerGas: 100n,
		maxPriorityFeePerGas: 100n
	};

	const mockContext = () =>
		new Map<symbol, SendContext>([[SEND_CONTEXT_KEY, initSendContext({ token: SEPOLIA_TOKEN })]]);

	const mockEthFeeStore = () => {
		const store = ethFeeStore.initEthFeeStore();
		store.setFee(mockFees);

		vi.spyOn(ethFeeStore, 'initEthFeeStore').mockImplementation(() => store);
	};

	const mockCkEthMinterInfoStore = () => {
		ckEthMinterInfoStore.set({
			id: ETHEREUM_TOKEN_ID,
			data: { data: mockCkMinterInfo, certified: true }
		});
	};

	const mockEthAddressStore = (address: OptionEthAddress = mockEthAddress) => {
		if (isNullish(address)) {
			ethAddressStore.reset();
			return;
		}

		ethAddressStore.set({
			certified: true,
			data: address
		});
	};

	const mockBalance = () => {
		balancesStore.set({
			id: SEPOLIA_TOKEN.id,
			data: { data: 9900000000000000n, certified: true }
		});
	};

	const props = {
		amount: sendAmount,
		destination: mockEthAddress3,
		nativeEthereumToken: ETHEREUM_TOKEN,
		sendCompleted: false,
		sourceNetwork: ETHEREUM_NETWORK,
		sendEnabled: true
	};
	let sendSpy: MockInstance;

	beforeEach(() => {
		vi.clearAllMocks();

		mockPage.reset();

		sendSpy = vi.spyOn(sendServices, 'send').mockResolvedValue({ hash: 'test' });
	});

	it('should render the success message instead of button if sendCompleted is true', () => {
		const { getByTestId } = render(AiAssistantReviewSendEthToken, {
			props: {
				...props,
				sendCompleted: true
			},
			context: mockContext()
		});

		expect(() => getByTestId(AI_ASSISTANT_SEND_TOKENS_BUTTON)).toThrow();
		expect(getByTestId(AI_ASSISTANT_SEND_TOKENS_SUCCESS_MESSAGE)).toBeInTheDocument();
	});

	it('should call send if all requirements are met', async () => {
		mockAuthStore();
		mockCkEthMinterInfoStore();
		mockEthAddressStore();
		mockBalance();
		mockEthFeeStore();

		const { getByTestId } = render(AiAssistantReviewSendEthToken, {
			props,
			context: mockContext()
		});

		const button = getByTestId(AI_ASSISTANT_SEND_TOKENS_BUTTON);

		await fireEvent.click(button);

		expect(sendSpy).toHaveBeenCalledOnce();
		expect(sendSpy).toHaveBeenCalledWith({
			from: mockEthAddress,
			to: mockEthAddress3,
			token: SEPOLIA_TOKEN,
			amount: parseToken({
				value: `${sendAmount}`,
				unitName: SEPOLIA_TOKEN.decimals
			}),
			maxFeePerGas: mockFees.maxFeePerGas,
			maxPriorityFeePerGas: mockFees.maxPriorityFeePerGas,
			gas: mockFees.gas,
			sourceNetwork: ETHEREUM_NETWORK,
			identity: mockIdentity,
			minterInfo: { data: mockCkMinterInfo, certified: true }
		});
	});

	it('should not call send if authIdentity is not defined', async () => {
		mockAuthStore(null);
		mockCkEthMinterInfoStore();
		mockEthAddressStore();
		mockBalance();
		mockEthFeeStore();

		const { getByTestId } = render(AiAssistantReviewSendEthToken, {
			props,
			context: mockContext()
		});

		const button = getByTestId(AI_ASSISTANT_SEND_TOKENS_BUTTON);

		await fireEvent.click(button);

		expect(sendSpy).not.toHaveBeenCalled();
	});

	it('should not call send if sendAmount is invalid', async () => {
		mockAuthStore();
		mockCkEthMinterInfoStore();
		mockEthAddressStore();
		mockBalance();
		mockEthFeeStore();

		const { getByTestId } = render(AiAssistantReviewSendEthToken, {
			props: {
				...props,
				amount: -1
			},
			context: mockContext()
		});

		const button = getByTestId(AI_ASSISTANT_SEND_TOKENS_BUTTON);

		await fireEvent.click(button);

		expect(sendSpy).not.toHaveBeenCalled();
	});

	it('should not call send if address is not available', async () => {
		mockAuthStore();
		mockBalance();
		mockEthAddressStore(null);
		mockCkEthMinterInfoStore();
		mockEthFeeStore();

		const { getByTestId } = render(AiAssistantReviewSendEthToken, {
			props,
			context: mockContext()
		});

		const button = getByTestId(AI_ASSISTANT_SEND_TOKENS_BUTTON);

		await fireEvent.click(button);

		expect(sendSpy).not.toHaveBeenCalled();
	});

	it('should not call send if sendEnabled is false', async () => {
		mockAuthStore();
		mockBalance();
		mockEthAddressStore(null);
		mockCkEthMinterInfoStore();
		mockEthFeeStore();

		const { getByTestId } = render(AiAssistantReviewSendEthToken, {
			props: {
				...props,
				sendEnabled: false
			},
			context: mockContext()
		});

		const button = getByTestId(AI_ASSISTANT_SEND_TOKENS_BUTTON);

		await fireEvent.click(button);

		expect(sendSpy).not.toHaveBeenCalled();
	});
});
