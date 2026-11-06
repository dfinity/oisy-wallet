import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import * as sendServices from '$icp/services/ic-send.services';
import type { IcCkToken } from '$icp/types/ic-token';
import AiAssistantReviewSendIcToken from '$lib/components/ai-assistant/AiAssistantReviewSendIcToken.svelte';
import {
	AI_ASSISTANT_SEND_TOKENS_BUTTON,
	AI_ASSISTANT_SEND_TOKENS_SUCCESS_MESSAGE
} from '$lib/constants/test-ids.constants';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import * as toasts from '$lib/stores/toasts.store';
import { parseToken } from '$lib/utils/parse.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockValidIcCkToken } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity, mockPrincipalText } from '$tests/mocks/identity.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import type { MockInstance } from 'vitest';

describe('AiAssistantReviewSendIcToken', () => {
	const sendAmount = 0.001;
	const ckBtcToken = {
		...mockValidIcCkToken,
		symbol: BTC_MAINNET_TOKEN.twinTokenSymbol
	} as IcCkToken;

	const mockContext = () =>
		new Map<symbol, SendContext>([[SEND_CONTEXT_KEY, initSendContext({ token: ckBtcToken })]]);

	const props = {
		amount: sendAmount,
		destination: mockPrincipalText,
		sendCompleted: false,
		sendEnabled: true,
		onSendCompleted: vi.fn()
	};
	let sendSpy: MockInstance;

	beforeEach(() => {
		vi.clearAllMocks();

		mockPage.reset();

		sendSpy = vi.spyOn(sendServices, 'sendIc').mockResolvedValue(undefined);
	});

	it('should render the success message instead of button if sendCompleted is true', () => {
		const { getByTestId } = render(AiAssistantReviewSendIcToken, {
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

		const { getByTestId } = render(AiAssistantReviewSendIcToken, {
			props,
			context: mockContext()
		});

		const button = getByTestId(AI_ASSISTANT_SEND_TOKENS_BUTTON);

		await fireEvent.click(button);

		expect(sendSpy).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				to: mockPrincipalText,
				amount: parseToken({
					value: `${sendAmount}`,
					unitName: ckBtcToken.decimals
				}),
				identity: mockIdentity,
				token: ckBtcToken
			})
		);
	});

	it('should not call send if authIdentity is not defined', async () => {
		mockAuthStore(null);

		const { getByTestId } = render(AiAssistantReviewSendIcToken, {
			props,
			context: mockContext()
		});

		const button = getByTestId(AI_ASSISTANT_SEND_TOKENS_BUTTON);

		await fireEvent.click(button);

		expect(sendSpy).not.toHaveBeenCalled();
	});

	it('should not call send if sendAmount is invalid', async () => {
		const { getByTestId } = render(AiAssistantReviewSendIcToken, {
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

	it('should not call send if sendEnabled is invalid', async () => {
		const { getByTestId } = render(AiAssistantReviewSendIcToken, {
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

	describe('when a send fails', () => {
		beforeEach(() => {
			mockAuthStore();

			vi.spyOn(toasts, 'toastsError').mockImplementation(() => Symbol('toast'));

			vi.useFakeTimers({ toFake: ['Date'] });
			vi.setSystemTime(new Date('2026-11-06T10:00:00Z'));
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should send the same transfer again', async () => {
			sendSpy.mockRejectedValueOnce(new Error('Test error')).mockResolvedValueOnce(undefined);

			const { getByTestId } = render(AiAssistantReviewSendIcToken, {
				props,
				context: mockContext()
			});

			await fireEvent.click(getByTestId(AI_ASSISTANT_SEND_TOKENS_BUTTON));

			await waitFor(() => expect(toasts.toastsError).toHaveBeenCalledOnce());

			vi.setSystemTime(new Date('2026-11-06T10:01:00Z'));

			await fireEvent.click(getByTestId(AI_ASSISTANT_SEND_TOKENS_BUTTON));

			await waitFor(() => expect(sendSpy).toHaveBeenCalledTimes(2));

			const [[first], [second]] = sendSpy.mock.calls;

			expect(first.createdAt).toBe(BigInt(new Date('2026-11-06T10:00:00Z').getTime()) * 1_000_000n);
			expect(second.createdAt).toBe(first.createdAt);
		});
	});
});
