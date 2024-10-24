<script lang="ts">
	import { debounce, isNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { tokenAsIcToken } from '$icp/derived/ic-token.derived';
	import { queryEstimateFee } from '$icp/services/ckbtc.services';
	import { BITCOIN_FEE_CONTEXT_KEY, type BitcoinFeeContext } from '$icp/stores/bitcoin-fee.store';
	import { isTokenCkBtcLedger } from '$icp/utils/ic-send.utils';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { tokenDecimals } from '$lib/derived/token.derived';
	import type { NetworkId } from '$lib/types/network';
	import { isNetworkIdBitcoin } from '$lib/utils/network.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	export let amount: string | number | undefined = undefined;
	export let networkId: NetworkId | undefined = undefined;

	let ckBTC = false;
	$: ckBTC = isTokenCkBtcLedger($tokenAsIcToken);

	const { store } = getContext<BitcoinFeeContext>(BITCOIN_FEE_CONTEXT_KEY);

	const loadEstimatedFee = async () => {
		if (!ckBTC) {
			return;
		}

		if (!isNetworkIdBitcoin(networkId)) {
			store.setFee(null);
			return;
		}

		if (isNullish(amount) || amount === '') {
			store.setFee(null);
			return;
		}

		const { fee, result } = await queryEstimateFee({
			identity: $authIdentity,
			amount: parseToken({
				value: `${amount}`,
				unitName: $tokenDecimals
			}).toBigInt(),
			...$tokenAsIcToken
		});

		if (isNullish(fee) || result === 'error') {
			store.setFee(null);
			return;
		}

		store.setFee({
			bitcoinFee: fee
		});
	};

	const debounceEstimateFee = debounce(loadEstimatedFee);

	$: amount, networkId, (() => debounceEstimateFee())();
</script>

<slot />
