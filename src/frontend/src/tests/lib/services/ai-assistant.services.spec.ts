import type { chat_response_v1 } from '$declarations/llm/llm.did';
import { llmChat } from '$lib/api/llm.api';
import { askLlm } from '$lib/services/ai-assistant.services';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { fromNullable, toNullable } from '@dfinity/utils';

vi.mock('$lib/api/llm.api');

describe('ai-assistant.services', () => {
	describe('askLlm', () => {
		beforeEach(() => {
			vi.resetAllMocks();
		});

		it('calls API correctly', async () => {
			const response = {
				message: {
					content: toNullable('content'),
					tool_calls: toNullable()
				}
			} as chat_response_v1;

			vi.mocked(llmChat).mockResolvedValue(response);

			const result = await askLlm({
				identity: mockIdentity,
				messages: [{ user: { content: 'test' } }]
			});

			expect(llmChat).toHaveBeenCalledOnce();
			expect(result).toStrictEqual(fromNullable(response.message.content));
		});
	});
});
