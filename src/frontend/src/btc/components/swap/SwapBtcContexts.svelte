<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { onDestroy, type Snippet } from 'svelte';
	import UtxosFeeContexts from '$btc/components/fee/UtxosFeeContexts.svelte';
	import UtxosFeeLoader from '$btc/components/fee/UtxosFeeLoader.svelte';
	import { resetUtxosDataStores } from '$btc/utils/btc-utxos.utils';
	import { btcAddressMainnet } from '$lib/derived/address.derived';
	import type { NetworkId } from '$lib/types/network';
	import type { OptionAmount } from '$lib/types/send';

	interface Props {
		load: boolean;
		amount: OptionAmount;
		networkId?: NetworkId;
		children: Snippet;
	}

	let { load, amount, networkId, children }: Props = $props();

	// Not `$state`: nothing renders off it, and it must survive as plain history so the
	// teardown below can tell whether this flow ever touched the Bitcoin stores.
	let loaded = false;

	$effect(() => {
		loaded = loaded || load;
	});

	// The UTXO set and the pending-transaction list have no other invalidation: no worker
	// refreshes them, and the only other write is the deliberate reload `validateBtcSend`
	// does just before it validates. So every flow that fills them clears them when it
	// closes — `TokenActionContext` for Send, `ConvertContexts` for Convert — and this one
	// has to as well. Left populated, they outlive the swap that spent them: the next flow
	// would select UTXOs this one already committed, and quote an offer that cannot execute.
	//
	// Deliberately *not* cleared when the source token merely switches away from Bitcoin:
	// the data is still valid for this session, and the user may switch back.
	onDestroy(() => {
		if (loaded) {
			resetUtxosDataStores();
		}
	});
</script>

<!--
  UTXO selection for a Bitcoin-source swap, mounted *above* the quote fan-out rather than
  inside the wizard. Two reasons:

  - The BTC → ckBTC quote prices the Bitcoin network fee from `allUtxosStore`,
    `feeRatePercentilesStore` and `btcPendingSentTransactionsStore`, and it reads them
    directly because a service cannot see a Svelte context. Loading them from here means
    they are already filled by the time the user has typed an amount, instead of the first
    quote coming back empty and the form briefly claiming no swap is offered.
  - The form needs a fee before any offer exists, for the Max button and the amount
    validation. `UtxosFeeLoader` prices a default amount on mount, so it has one.

  The loader is rendered beside the content, not around it, so that switching the source
  token away from Bitcoin unmounts the loader without also remounting the swap flow.
-->
<UtxosFeeContexts>
	<!-- The address is required, not defaulted: the loaders only guard against a *nullish*
	     source, so an empty string would send them querying the bitcoin canister and the
	     backend for the pending transactions of no address at all. -->
	{#if load && nonNullish($btcAddressMainnet)}
		<UtxosFeeLoader {amount} {networkId} source={$btcAddressMainnet} />
	{/if}

	{@render children()}
</UtxosFeeContexts>
