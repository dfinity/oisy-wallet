<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { type Snippet, untrack } from 'svelte';
	import { loadBtcPendingSentTransactions } from '$btc/services/btc-pending-sent-transactions.services';
	import { btcPendingSentTransactionsStore } from '$btc/stores/btc-pending-sent-transactions.store';
	import { authIdentity } from '$lib/derived/auth.derived';
	import type { NetworkId } from '$lib/types/network';

	interface Props {
		source: string;
		networkId?: NetworkId;
		children: Snippet;
	}

	let { source, networkId, children }: Props = $props();

	$effect(() => {
		[networkId, source];

		untrack(
			() =>
				isNullish($btcPendingSentTransactionsStore[source]) &&
				loadBtcPendingSentTransactions({
					identity: $authIdentity,
					networkId,
					address: source
				})
		);
	});
</script>

{@render children()}
