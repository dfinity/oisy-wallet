<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { untrack } from 'svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';
	import { enabledSplTokens } from '$sol/derived/spl.derived';
	import { summarizeSolWalletConnectRequest } from '$sol/services/wallet-connect-summary.services';
	import type { SolSimulationPreview } from '$sol/types/sol-simulation';
	import { toSolWalletConnectSummaryFacts } from '$sol/utils/wallet-connect-summary.utils';

	interface Props {
		amount?: bigint;
		token: Token;
		feeToken: Token;
		source: string;
		destination: string;
		isApproval: boolean;
		unreviewed: boolean;
		networkFee: bigint;
		prioritizationFee?: bigint;
		preview?: SolSimulationPreview;
	}

	let {
		amount,
		token,
		feeToken,
		source,
		destination,
		isApproval,
		unreviewed,
		networkFee,
		prioritizationFee,
		preview
	}: Props = $props();

	let summary = $state<string | undefined>();

	let facts = $derived(
		toSolWalletConnectSummaryFacts({
			amount,
			token,
			feeToken,
			source,
			destination,
			isApproval,
			unreviewed,
			networkFee,
			prioritizationFee,
			preview,
			splTokens: $enabledSplTokens
		})
	);

	// Distinguishes the request the answer belongs to. Facts that change while a request is in
	// flight would otherwise be described by a sentence written about the previous ones.
	let requestId = 0;

	$effect(() => {
		const currentFacts = facts;
		const identity = $authIdentity;

		untrack(() => {
			summary = undefined;

			requestId = requestId + 1;
			const currentRequestId = requestId;

			// Deliberately not awaited: the review is already complete and correct without this
			// sentence, and approving must never wait on an update call to the LLM canister.
			void summarizeSolWalletConnectRequest({ facts: currentFacts, identity })
				.then((result) => {
					if (currentRequestId === requestId) {
						summary = result;
					}
				})
				// The service resolves rather than rejects by contract. The guard is here so that a
				// later change to it cannot turn a decorative sentence into an unhandled rejection
				// raised from a screen the user is about to sign on.
				.catch(() => undefined);
		});
	});
</script>

<!-- The model only ever rephrases the rows below, and only those rows are authoritative, so the
     sentence is interpolated as text. It is never rendered as markup: no `Html`, no `Markdown`,
     no `{@html}`, whatever the model returns. -->
{#if nonNullish(summary)}
	<MessageBox level="plain" testId="wallet-connect-summary">
		<span class="flex flex-col gap-1">
			<span class="text-tertiary">{$i18n.wallet_connect.text.summary}</span>

			<span data-tid="wallet-connect-summary-text">{summary}</span>

			<span class="text-tertiary text-xs">{$i18n.wallet_connect.text.summary_note}</span>
		</span>
	</MessageBox>
{/if}
