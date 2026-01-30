<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { type Snippet, untrack } from 'svelte';
	import { CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS } from '$btc/constants/btc.constants';
	import { allUtxosStore } from '$btc/stores/all-utxos.store';
	import { getUtxosQuery } from '$icp/api/bitcoin.api';
	import { authIdentity } from '$lib/derived/auth.derived';
	import type { NetworkId } from '$lib/types/network';
	import { mapNetworkIdToBitcoinNetwork } from '$lib/utils/network.utils';
	import {BITCOIN_CANISTER_IDS, IC_CKBTC_MINTER_CANISTER_ID} from "$env/tokens/tokens-icp/tokens.icp.ck.btc.env";

	interface Props {
		source?: string;
		networkId?: NetworkId;
		children: Snippet;
	}

	let { source, networkId, children }: Props = $props();

	const loadAllUtxos = async () => {
		if (isNullish(networkId) || isNullish(source)) {
			return;
		}

		const network = mapNetworkIdToBitcoinNetwork(networkId);

		if (isNullish(network)) {
			return;
		}

		const { utxos: allUtxos } = await getUtxosQuery({
			identity: $authIdentity,
			address: source,
			network,
			bitcoinCanisterId: BITCOIN_CANISTER_IDS[IC_CKBTC_MINTER_CANISTER_ID],
			minConfirmations: CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS
		});

		allUtxosStore.setAllUtxos({ allUtxos });
	};

	$effect(() => {
		[source, networkId];

		untrack(() => nonNullish(source) && isNullish($allUtxosStore?.allUtxos) && loadAllUtxos());
	});
</script>

{@render children()}
