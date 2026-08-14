<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';
	import SolSummary from '$sol/components/core/SolSummary.svelte';
	import { enabledSplTokens } from '$sol/derived/spl.derived';
	import type { SolSimulationPreview } from '$sol/types/sol-simulation';
	import { toSolSignRequestSummaryFacts } from '$sol/utils/sol-summary.utils';

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

	let facts = $derived(
		toSolSignRequestSummaryFacts({
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
</script>

<SolSummary {facts} note={$i18n.wallet_connect.text.summary_note} />
