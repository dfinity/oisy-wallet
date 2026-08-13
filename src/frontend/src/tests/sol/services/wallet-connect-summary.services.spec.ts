import type { chat_response_v1 } from '$declarations/llm/llm.did';
import { llmChat } from '$lib/api/llm.api';
import { AI_ASSISTANT_LLM_MODEL } from '$lib/constants/ai-assistant.constants';
import {
	SOLANA_WALLET_CONNECT_SUMMARY_SYSTEM_PROMPT,
	SOLANA_WALLET_CONNECT_SUMMARY_TIMEOUT_MILLISECONDS
} from '$sol/constants/wallet-connect.constants';
import { summarizeSolWalletConnectRequest } from '$sol/services/wallet-connect-summary.services';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { toNullable } from '@dfinity/utils';

vi.mock('$lib/api/llm.api');

describe('wallet-connect-summary.services', () => {
	const facts = ['Amount: 0.001 SOL', 'Recipient: 4GsmSut...AM56JR8'];

	const answer = (content: string): chat_response_v1 => ({
		message: { content: toNullable(content), tool_calls: [] }
	});

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('summarizeSolWalletConnectRequest', () => {
		it('should return the sentence the model wrote', async () => {
			vi.mocked(llmChat).mockResolvedValue(answer('Transfer of 0.001 SOL.'));

			const summary = await summarizeSolWalletConnectRequest({ facts, identity: mockIdentity });

			expect(summary).toBe('Transfer of 0.001 SOL.');
		});

		// The model is given the facts the review derived, and nothing else: no instruction data,
		// no tools it could call, no history it could carry over.
		it('should send only the facts it was given', async () => {
			vi.mocked(llmChat).mockResolvedValue(answer('Transfer of 0.001 SOL.'));

			await summarizeSolWalletConnectRequest({ facts, identity: mockIdentity });

			expect(llmChat).toHaveBeenCalledExactlyOnceWith({
				request: {
					model: AI_ASSISTANT_LLM_MODEL,
					messages: [
						{ system: { content: SOLANA_WALLET_CONNECT_SUMMARY_SYSTEM_PROMPT } },
						{ user: { content: 'Amount: 0.001 SOL\nRecipient: 4GsmSut...AM56JR8' } }
					],
					tools: []
				},
				identity: mockIdentity
			});
		});

		it('should return nothing when the call fails', async () => {
			vi.mocked(llmChat).mockRejectedValue(new Error('canister rejected the call'));

			await expect(
				summarizeSolWalletConnectRequest({ facts, identity: mockIdentity })
			).resolves.toBeUndefined();
		});

		it('should return nothing when the model answers with nothing', async () => {
			vi.mocked(llmChat).mockResolvedValue({ message: { content: [], tool_calls: [] } });

			await expect(
				summarizeSolWalletConnectRequest({ facts, identity: mockIdentity })
			).resolves.toBeUndefined();
		});

		it('should return nothing when the model answers with something it was not given', async () => {
			vi.mocked(llmChat).mockResolvedValue(answer('Transfer of 42 SOL to a Raydium pool.'));

			await expect(
				summarizeSolWalletConnectRequest({ facts, identity: mockIdentity })
			).resolves.toBeUndefined();
		});

		it('should return nothing when the call outlives its budget', async () => {
			vi.useFakeTimers();

			vi.mocked(llmChat).mockReturnValue(new Promise(() => {}));

			const pending = summarizeSolWalletConnectRequest({ facts, identity: mockIdentity });

			await vi.advanceTimersByTimeAsync(SOLANA_WALLET_CONNECT_SUMMARY_TIMEOUT_MILLISECONDS);

			await expect(pending).resolves.toBeUndefined();

			vi.useRealTimers();
		});

		it('should not call the canister without an identity', async () => {
			const summary = await summarizeSolWalletConnectRequest({ facts, identity: undefined });

			expect(summary).toBeUndefined();
			expect(llmChat).not.toHaveBeenCalled();
		});

		it('should not call the canister without facts', async () => {
			const summary = await summarizeSolWalletConnectRequest({
				facts: [],
				identity: mockIdentity
			});

			expect(summary).toBeUndefined();
			expect(llmChat).not.toHaveBeenCalled();
		});
	});
});
