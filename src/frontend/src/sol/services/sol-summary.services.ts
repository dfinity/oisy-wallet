import { llmChat } from '$lib/api/llm.api';
import { AI_ASSISTANT_LLM_MODEL } from '$lib/constants/ai-assistant.constants';
import type { NullishIdentity } from '$lib/types/identity';
import {
	SOLANA_SUMMARY_SYSTEM_PROMPT,
	SOLANA_SUMMARY_TIMEOUT_MILLISECONDS
} from '$sol/constants/sol-summary.constants';
import { sanitizeSolSummary } from '$sol/utils/sol-summary.utils';
import { fromNullable, isNullish, toNullable } from '@dfinity/utils';

/**
 * One sentence phrasing facts the screen has already derived, or nothing.
 *
 * The caller decides what those facts are, which is what makes this serve a sign request and a
 * transaction opened from the history alike: the service only knows it was handed lines of text to
 * rephrase, and never sees the transaction they came from.
 *
 * The LLM canister is an update call, so this takes seconds: consensus, then queueing, then
 * generation. Nothing on the screen waits for it and nothing on the screen depends on it, which is
 * why every failure path here ends in `undefined` rather than in an error the caller has to
 * handle. A summary that does not arrive leaves the screen exactly as it would have been.
 */
export const summarizeSolFacts = async ({
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
						{ system: { content: SOLANA_SUMMARY_SYSTEM_PROMPT } },
						{ user: { content: facts.join('\n') } }
					],
					tools: toNullable()
				},
				identity
			}),
			new Promise<undefined>((resolve) => {
				timer = setTimeout(() => resolve(undefined), SOLANA_SUMMARY_TIMEOUT_MILLISECONDS);
			})
		]);

		if (isNullish(response)) {
			return;
		}

		return sanitizeSolSummary({
			content: fromNullable(response.message.content),
			facts
		});
	} catch (_: unknown) {
		// Best-effort: the sentence is a convenience on top of a screen that is already complete,
		// so a canister that is slow, unreachable or disabled changes nothing about the screen.
	} finally {
		clearTimeout(timer);
	}
};
