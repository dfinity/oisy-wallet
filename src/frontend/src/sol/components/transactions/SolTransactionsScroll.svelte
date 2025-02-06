<script lang="ts">
	import { InfiniteScroll } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import {
		solAddressDevnet,
		solAddressLocal,
		solAddressMainnet,
		solAddressTestnet
	} from '$lib/derived/address.derived';
	import { networkId } from '$lib/derived/network.derived';
	import type { OptionSolAddress } from '$lib/types/address';
	import type { Token } from '$lib/types/token';
	import { last } from '$lib/utils/array.utils';
	import {
		isNetworkIdSOLDevnet,
		isNetworkIdSOLLocal,
		isNetworkIdSOLTestnet
	} from '$lib/utils/network.utils';
	import { solTransactions } from '$sol/derived/sol-transactions.derived';
	import { loadNextSolTransactions } from '$sol/services/sol-transactions.services';
	import { mapNetworkIdToNetwork } from '$sol/utils/network.utils';

	export let token: Token;

	let disableInfiniteScroll = false;

	let address: OptionSolAddress;
	$: address = isNetworkIdSOLTestnet($networkId)
		? $solAddressTestnet
		: isNetworkIdSOLDevnet($networkId)
			? $solAddressDevnet
			: isNetworkIdSOLLocal($networkId)
				? $solAddressLocal
				: $solAddressMainnet;

	const onIntersect = async () => {
		const lastSignature = last($solTransactions)?.signature;

		if (isNullish(lastSignature)) {
			// No transactions, we do nothing here and wait for the worker to post the first transactions
			return;
		}

		if (isNullish(token)) {
			// Prevent unlikely events. UI wise if we are about to load the next transactions, it's probably because transactions for a loaded token have been fetched.
			return;
		}

		const network = mapNetworkIdToNetwork(token.network.id);

		if (isNullish(network) || isNullish(address)) {
			return;
		}

		await loadNextSolTransactions({
			network: network,
			address: address,
			before: lastSignature,
			signalEnd: () => (disableInfiniteScroll = true)
		});
	};
</script>

<InfiniteScroll on:nnsIntersect={onIntersect} disabled={disableInfiniteScroll}>
	<slot />
</InfiniteScroll>
