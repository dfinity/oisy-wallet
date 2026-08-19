<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { tick, untrack } from 'svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { summarizeSolFacts } from '$sol/services/sol-summary.services';

	interface Props {
		facts: string[];
		// The screens that show this differ in what the reader must be told to trust instead of the
		// sentence: on a sign request it is what they are about to sign, elsewhere it is the rows.
		note?: string;
		// Fired once the sentence is on screen. A container that sized itself around the content
		// before the sentence arrived would otherwise clip it, since it lands seconds later.
		onRendered?: () => void;
	}

	let { facts, note, onRendered }: Props = $props();

	let summary = $state<string | undefined>();

	// Distinguishes the request the answer belongs to. Facts that change while a request is in
	// flight would otherwise be described by a sentence written about the previous ones.
	let requestId = 0;

	// Depend on the prompt's text, never on the array carrying it. The activity list rebuilds its
	// rows on every store tick, so an identical fact list arrives as a fresh array several times a
	// second. Tracking its identity re-fired this effect each time, and each firing cancelled the
	// answer the previous one was still waiting for: the sentence could never arrive, while the
	// canister was asked for it over a hundred times a minute for a single open group.
	let prompt = $derived(facts.join('\n'));

	$effect(() => {
		const currentPrompt = prompt;
		const identity = $authIdentity;

		untrack(() => {
			summary = undefined;

			requestId = requestId + 1;
			const currentRequestId = requestId;

			// Deliberately not awaited: the screen is already complete and correct without this
			// sentence, and nothing on it may wait on an update call to the LLM canister.
			void summarizeSolFacts({
				facts: currentPrompt.length === 0 ? [] : currentPrompt.split('\n'),
				identity
			})
				.then(async (result) => {
					if (currentRequestId !== requestId) {
						return;
					}

					summary = result;

					if (nonNullish(result)) {
						await tick();

						onRendered?.();
					}
				})
				// The service resolves rather than rejects by contract. The guard is here so that a
				// later change to it cannot turn a decorative sentence into an unhandled rejection
				// raised from a screen the user is about to sign on.
				.catch(() => undefined);
		});
	});
</script>

<!-- The model only ever rephrases rows the screen derived, and only those rows are authoritative,
     so the sentence is interpolated as text. It is never rendered as markup: no `Html`, no
     `Markdown`, no `{@html}`, whatever the model returns. -->
{#if nonNullish(summary)}
	<MessageBox level="plain" testId="sol-summary">
		<span class="flex flex-col gap-1">
			<span class="text-tertiary">{$i18n.transaction.text.summary}</span>

			<span data-tid="sol-summary-text">{summary}</span>

			<span class="text-tertiary text-xs">{note ?? $i18n.transaction.text.summary_note}</span>
		</span>
	</MessageBox>
{/if}
