import type { chat_response_v1 } from '$declarations/llm/llm.did';
import { llmChat } from '$lib/api/llm.api';
import { AI_ASSISTANT_LLM_MODEL } from '$lib/constants/ai-assistant.constants';
import * as consoleUtils from '$lib/utils/console.utils';
import {
	SOLANA_SUMMARY_SYSTEM_PROMPT,
	SOLANA_SUMMARY_TIMEOUT_MILLISECONDS
} from '$sol/constants/sol-summary.constants';
import { summarizeSolFacts } from '$sol/services/sol-summary.services';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { toNullable } from '@dfinity/utils';

vi.mock('$lib/api/llm.api');

describe('sol-summary.services', () => {
	const facts = ['Amount: 0.001 SOL', 'Recipient: 4GsmSut...AM56JR8'];

	const answer = (content: string): chat_response_v1 => ({
		message: { content: toNullable(content), tool_calls: [] }
	});

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('summarizeSolFacts', () => {
		it('should return the sentence the model wrote', async () => {
			vi.mocked(llmChat).mockResolvedValue(answer('Transfer of 0.001 SOL.'));

			const summary = await summarizeSolFacts({ facts, identity: mockIdentity });

			expect(summary).toBe('Transfer of 0.001 SOL.');
		});

		// The model is given the facts the review derived, and nothing else: no instruction data,
		// no tools it could call, no history it could carry over.
		it('should send only the facts it was given', async () => {
			vi.mocked(llmChat).mockResolvedValue(answer('Transfer of 0.001 SOL.'));

			await summarizeSolFacts({ facts, identity: mockIdentity });

			expect(llmChat).toHaveBeenCalledExactlyOnceWith({
				request: {
					model: AI_ASSISTANT_LLM_MODEL,
					messages: [
						{ system: { content: SOLANA_SUMMARY_SYSTEM_PROMPT } },
						{ user: { content: 'Amount: 0.001 SOL\nRecipient: 4GsmSut...AM56JR8' } }
					],
					tools: []
				},
				identity: mockIdentity
			});
		});

		it('should return nothing, and say the call failed, when the call fails', async () => {
			const spyWarn = vi.spyOn(consoleUtils, 'consoleWarn').mockImplementation(() => undefined);

			const err = new Error('canister rejected the call');
			vi.mocked(llmChat).mockRejectedValue(err);

			await expect(summarizeSolFacts({ facts, identity: mockIdentity })).resolves.toBeUndefined();

			expect(spyWarn).toHaveBeenCalledExactlyOnceWith('Generated summary: the call failed', err);
		});

		it('should return nothing, and say so, when the model answers with nothing', async () => {
			const spyWarn = vi.spyOn(consoleUtils, 'consoleWarn').mockImplementation(() => undefined);

			vi.mocked(llmChat).mockResolvedValue({ message: { content: [], tool_calls: [] } });

			await expect(summarizeSolFacts({ facts, identity: mockIdentity })).resolves.toBeUndefined();

			expect(spyWarn).toHaveBeenCalledExactlyOnceWith(
				'Generated summary: the model answered with nothing'
			);
		});

		// A refused answer used to leave no trace, which made a dropped sentence look exactly like one
		// that never came back. Saying what was refused is what tells the two apart.
		it('should return nothing, and say what it refused, when the model answers with something it was not given', async () => {
			const spyWarn = vi.spyOn(consoleUtils, 'consoleWarn').mockImplementation(() => undefined);

			vi.mocked(llmChat).mockResolvedValue(answer('Transfer of 42 SOL to a Raydium pool.'));

			await expect(summarizeSolFacts({ facts, identity: mockIdentity })).resolves.toBeUndefined();

			expect(spyWarn).toHaveBeenCalledExactlyOnceWith(
				'Generated summary refused:',
				'Transfer of 42 SOL to a Raydium pool.'
			);
		});

		it('should say nothing when the model answers with something it can keep', async () => {
			const spyWarn = vi.spyOn(consoleUtils, 'consoleWarn').mockImplementation(() => undefined);

			vi.mocked(llmChat).mockResolvedValue(answer('Transfer of 0.001 SOL.'));

			await expect(summarizeSolFacts({ facts, identity: mockIdentity })).resolves.toBe(
				'Transfer of 0.001 SOL.'
			);

			expect(spyWarn).not.toHaveBeenCalled();
		});

		it('should return nothing, and say so, when the call outlives its budget', async () => {
			const spyWarn = vi.spyOn(consoleUtils, 'consoleWarn').mockImplementation(() => undefined);

			vi.useFakeTimers();

			vi.mocked(llmChat).mockReturnValue(new Promise(() => {}));

			const pending = summarizeSolFacts({ facts, identity: mockIdentity });

			await vi.advanceTimersByTimeAsync(SOLANA_SUMMARY_TIMEOUT_MILLISECONDS);

			await expect(pending).resolves.toBeUndefined();

			expect(spyWarn).toHaveBeenCalledExactlyOnceWith(
				'Generated summary: no answer within',
				SOLANA_SUMMARY_TIMEOUT_MILLISECONDS,
				'ms'
			);

			vi.useRealTimers();
		});

		it('should not call the canister without an identity', async () => {
			const summary = await summarizeSolFacts({ facts, identity: undefined });

			expect(summary).toBeUndefined();
			expect(llmChat).not.toHaveBeenCalled();
		});

		it('should not call the canister without facts', async () => {
			const summary = await summarizeSolFacts({
				facts: [],
				identity: mockIdentity
			});

			expect(summary).toBeUndefined();
			expect(llmChat).not.toHaveBeenCalled();
		});
	});
});
