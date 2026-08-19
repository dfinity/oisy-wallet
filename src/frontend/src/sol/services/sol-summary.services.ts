import { llmChat } from '$lib/api/llm.api';
import { AI_ASSISTANT_LLM_MODEL } from '$lib/constants/ai-assistant.constants';
import type { NullishIdentity } from '$lib/types/identity';
import { consoleWarn } from '$lib/utils/console.utils';
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

	const ask = () =>
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
		});

	// The canister answers off-chain and rejects with a timeout when a worker does not come back in
	// time. Measured on staging: a short prompt was answered while a longer one from the same screen
	// was rejected seconds later, so the rejection is about that moment rather than about the
	// request. One retry rides it out, and one is all it gets: an unbounded loop here is what put a
	// hundred calls a minute on this canister once already.
	const askOnceMore = async () => {
		try {
			return await ask();
		} catch (err: unknown) {
			consoleWarn('Generated summary: retrying after', err);

			return await ask();
		}
	};

	try {
		const response = await Promise.race([
			askOnceMore(),
			new Promise<undefined>((resolve) => {
				timer = setTimeout(() => resolve(undefined), SOLANA_SUMMARY_TIMEOUT_MILLISECONDS);
			})
		]);

		// Every way this can fail used to look the same from outside: no sentence. Distinguishing
		// them is the difference between reading the cause and guessing at it, and guessing cost
		// three passes on a bug that was never where it appeared to be. The screen is unchanged
		// either way; only the reason is written down.
		if (isNullish(response)) {
			consoleWarn('Generated summary: no answer within', SOLANA_SUMMARY_TIMEOUT_MILLISECONDS, 'ms');

			return;
		}

		const answer = fromNullable(response.message.content);

		if (isNullish(answer)) {
			consoleWarn('Generated summary: the model answered with nothing');

			return;
		}

		const sentence = sanitizeSolSummary({ content: answer, facts });

		if (isNullish(sentence)) {
			consoleWarn('Generated summary refused:', answer);
		}

		return sentence;
	} catch (err: unknown) {
		// Best-effort: the sentence is a convenience on top of a screen that is already complete,
		// so a canister that is slow, unreachable or disabled changes nothing about the screen.
		// It is still said out loud, because a swallowed rejection is indistinguishable from a
		// model that had nothing to say.
		consoleWarn('Generated summary: the call failed', err);
	} finally {
		clearTimeout(timer);
	}
};
