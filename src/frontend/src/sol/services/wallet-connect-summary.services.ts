import { llmChat } from '$lib/api/llm.api';
import { AI_ASSISTANT_LLM_MODEL } from '$lib/constants/ai-assistant.constants';
import type { NullishIdentity } from '$lib/types/identity';
import {
	SOLANA_WALLET_CONNECT_SUMMARY_SYSTEM_PROMPT,
	SOLANA_WALLET_CONNECT_SUMMARY_TIMEOUT_MILLISECONDS
} from '$sol/constants/wallet-connect.constants';
import { sanitizeSolWalletConnectSummary } from '$sol/utils/wallet-connect-summary.utils';
import { fromNullable, isNullish, toNullable } from '@dfinity/utils';

/**
 * One sentence phrasing the facts the review has already derived, or nothing.
 *
 * The LLM canister is an update call, so this takes seconds: consensus, then queueing, then
 * generation. Nothing in the review waits for it and nothing in the review depends on it, which
 * is why every failure path here ends in `undefined` rather than in an error the caller has to
 * handle. A summary that does not arrive leaves the review exactly as it would have been.
 */
export const summarizeSolWalletConnectRequest = async ({
	facts,
	identity
}: {
	facts: string[];
	identity: NullishIdentity;
}): Promise<string | undefined> => {
	if (isNullish(identity) || facts.length === 0) {
		return;
	}

	let timer: ReturnType<typeof setTimeout> | undefined;

	try {
		const response = await Promise.race([
			llmChat({
				request: {
					model: AI_ASSISTANT_LLM_MODEL,
					messages: [
						{ system: { content: SOLANA_WALLET_CONNECT_SUMMARY_SYSTEM_PROMPT } },
						{ user: { content: facts.join('\n') } }
					],
					tools: toNullable()
				},
				identity
			}),
			new Promise<undefined>((resolve) => {
				timer = setTimeout(
					() => resolve(undefined),
					SOLANA_WALLET_CONNECT_SUMMARY_TIMEOUT_MILLISECONDS
				);
			})
		]);

		if (isNullish(response)) {
			return;
		}

		return sanitizeSolWalletConnectSummary({
			content: fromNullable(response.message.content),
			facts
		});
	} catch (_: unknown) {
		// Best-effort: the sentence is a convenience on top of a review that is already complete,
		// so a canister that is slow, unreachable or disabled changes nothing about the review.
	} finally {
		clearTimeout(timer);
	}
};
