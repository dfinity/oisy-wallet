<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { DEFAULT_BTC_AMOUNT_FOR_UTXOS_FEE } from '$btc/constants/btc.constants';
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

		// If utxos are already known and the new amount is nullish or zero, we keep using the previous fee value
		if (nonNullish($store?.utxosFee) && (isNullish(amount) || Number(amount) === 0)) {
			return;
		}

		// UTXOs API call is very time-consuming operation, even though the fees do not change often (no matter what amount is provided)
		// Therefore, to improve UX, we start fetching the fee directly on modal open event
		// Initially, we fetch fees with default value and then re-fetch it in the background on value change
		const parsedAmount =
			nonNullish(amount) && Number(amount) !== 0
				? Number(amount)
				: Number(DEFAULT_BTC_AMOUNT_FOR_UTXOS_FEE);

		// WizardModal re-renders content on step change (e.g. when switching between Convert to Review steps)
		// To avoid re-fetching the fees, we need to check if amount hasn't changed since the last request
		if (
			amountError ||
			isNullish(networkId) ||
			(nonNullish($store) && $store.amountForFee === parsedAmount)
		) {
			return;
		}

		const network = mapNetworkIdToBitcoinNetwork(networkId);

		const utxosFee = nonNullish(network)
			? await selectUtxosFeeApi({
					amount: parsedAmount,
					network,
					identity: $authIdentity
				})
			: undefined;

		if (isNullish(utxosFee)) {
			store.reset();
			return;
		}

		store.setUtxosFee({
			utxosFee,
			amountForFee: parsedAmount
		});
	};

	const debounceEstimateFee = debounce(loadEstimatedFee);

	$: amount, networkId, amountError, debounceEstimateFee();
</script>

<slot />
