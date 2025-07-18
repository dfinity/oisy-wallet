import type { chat_request_v1, chat_response_v1 } from '$declarations/llm/llm.did';
import { llmChat } from '$lib/api/llm.api';
import { LlmCanister } from '$lib/canisters/llm.canister';
import * as appContants from '$lib/constants/app.constants';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockLedgerCanisterId } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mock } from 'vitest-mock-extended';

describe('llm.api', () => {
	describe('llmChat', () => {
		const llmCanisterMock = mock<LlmCanister>();
		const response = {
			message: {
				content: ['hello'],
				tool_calls: []
			}
		} as chat_response_v1;
		const request = {
			model: 'test',
			tools: [],
			messages: [{ user: { content: 'hello' } }]
		} as chat_request_v1;

		beforeEach(() => {
			// eslint-disable-next-line require-await
			vi.spyOn(LlmCanister, 'create').mockImplementation(async () => llmCanisterMock);

			vi.spyOn(appContants, 'LLM_CANISTER_ID', 'get').mockImplementation(
				() => mockLedgerCanisterId
			);
		});

		it('correctly calls the llmCanister chat method', async () => {
			mockAuthStore();
			llmCanisterMock.chat.mockResolvedValue(response);

			const result = await llmChat({
				identity: mockIdentity,
				request
			});

			expect(llmCanisterMock.chat).toHaveBeenCalledOnce();
			expect(result).toBe(response);
		});

		it('throws an error if the llmCanister chat method called without identity', async () => {
			const res = llmChat({
				identity: null,
				request
			});

			await expect(res).rejects.toThrow();
		});
	});
});
