<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { selectUtxosFee as selectUtxosFeeApi } from '$btc/services/btc-send.services';
	import { UTXOS_FEE_CONTEXT_KEY, type UtxosFeeContext } from '$btc/stores/utxos-fee.store';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import type { NetworkId } from '$lib/types/network';
	import type { OptionAmount } from '$lib/types/send';
	import { mapNetworkIdToBitcoinNetwork } from '$lib/utils/network.utils';

	export let amount: OptionAmount = undefined;
	export let networkId: NetworkId | undefined = undefined;
	export let amountError = false;

	const { store } = getContext<UtxosFeeContext>(UTXOS_FEE_CONTEXT_KEY);

	const loadEstimatedFee = async () => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		// we need to make the value is not 0 because the utxos call fails if amount = 0
		if (amountError || isNullish(networkId) || isNullish(amount) || Number(amount) === 0) {
			store.reset();
			return;
		}

		const network = mapNetworkIdToBitcoinNetwork(networkId);

		const utxosFee = nonNullish(network)
			? await selectUtxosFeeApi({
					amount,
					network,
					identity: $authIdentity
				})
			: undefined;

		if (isNullish(utxosFee)) {
			store.reset();
			return;
		}

		store.setUtxosFee({
			utxosFee
		});
	};

	const debounceEstimateFee = debounce(loadEstimatedFee);

	$: amount, networkId, amountError, debounceEstimateFee();
</script>

<slot />
