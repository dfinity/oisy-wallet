<script lang="ts">
	import type { Token } from '$lib/types/token';
	import SolSummary from '$sol/components/core/SolSummary.svelte';
	import type { SolTransactionUi } from '$sol/types/sol-transaction';
	import { toSolTransactionSummaryFacts } from '$sol/utils/sol-summary.utils';

	interface Props {
		transaction: SolTransactionUi;
		token: Token;
	}

	let { transaction, token }: Props = $props();

	let facts = $derived(toSolTransactionSummaryFacts({ transaction, token }));
</script>

<SolSummary {facts} />
