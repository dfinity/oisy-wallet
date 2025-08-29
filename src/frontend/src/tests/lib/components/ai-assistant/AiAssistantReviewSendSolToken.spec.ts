import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import AiAssistantReviewSendSolToken from '$lib/components/ai-assistant/AiAssistantReviewSendSolToken.svelte';
import { ZERO } from '$lib/constants/app.constants';
import {
	AI_ASSISTANT_SEND_TOKENS_BUTTON,
	AI_ASSISTANT_SEND_TOKENS_SUCCESS_MESSAGE
} from '$lib/constants/test-ids.constants';
import { solAddressMainnetStore } from '$lib/stores/address.store';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import { parseToken } from '$lib/utils/parse.utils';
import * as solanaApi from '$sol/api/solana.api';
import * as sendServices from '$sol/services/sol-send.services';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { mockSolSignature } from '$tests/mocks/sol-signatures.mock';
import { mockSolAddress, mockSolAddress2 } from '$tests/mocks/sol.mock';
import { fireEvent, render } from '@testing-library/svelte';
import type { MockInstance } from 'vitest';

vi.mock('$lib/services/auth.services', () => ({
	nullishSignOut: vi.fn()
}));

describe('AiAssistantReviewSendSolToken', () => {
	const sendAmount = 0.001;

	const mockContext = () =>
		new Map<symbol, SendContext>([[SEND_CONTEXT_KEY, initSendContext({ token: SOLANA_TOKEN })]]);

	const mockAddress = () => solAddressMainnetStore.set({ data: mockSolAddress2, certified: true });

	const props = {
		amount: sendAmount,
		destination: mockSolAddress,
		sendCompleted: false
	};
	let sendSpy: MockInstance;

	beforeEach(() => {
		vi.clearAllMocks();

		mockPage.reset();

		vi.spyOn(solanaApi, 'estimatePriorityFee').mockResolvedValue(ZERO);
		sendSpy = vi.spyOn(sendServices, 'sendSol').mockResolvedValue(mockSolSignature());
	});

	it('should render the success message instead of button if sendCompleted is true', () => {
		const { getByTestId } = render(AiAssistantReviewSendSolToken, {
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
		mockAddress();

		const { getByTestId } = render(AiAssistantReviewSendSolToken, {
			props,
			context: mockContext()
		});

		const button = getByTestId(AI_ASSISTANT_SEND_TOKENS_BUTTON);

		await fireEvent.click(button);

		expect(sendSpy).toHaveBeenCalledOnce();
		expect(sendSpy).toHaveBeenCalledWith({
			destination: mockSolAddress,
			prioritizationFee: ZERO,
			source: mockSolAddress2,
			amount: parseToken({
				value: `${sendAmount}`,
				unitName: SOLANA_TOKEN.decimals
			}),
			identity: mockIdentity,
			token: SOLANA_TOKEN
		});
	});

	it('should not call send if authIdentity is not defined', async () => {
		mockAuthStore(null);

		const { getByTestId } = render(AiAssistantReviewSendSolToken, {
			props,
			context: mockContext()
		});

		const button = getByTestId(AI_ASSISTANT_SEND_TOKENS_BUTTON);

		await fireEvent.click(button);

		expect(sendSpy).not.toHaveBeenCalled();
	});

	it('should not call send if sendAmount is invalid', async () => {
		const { getByTestId } = render(AiAssistantReviewSendSolToken, {
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
});
