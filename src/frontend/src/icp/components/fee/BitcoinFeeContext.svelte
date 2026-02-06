<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, type Snippet, untrack } from 'svelte';
	import { queryEstimateFee } from '$icp/services/ckbtc.services';
	import { BITCOIN_FEE_CONTEXT_KEY, type BitcoinFeeContext } from '$icp/stores/bitcoin-fee.store';
	import { isTokenCkBtcLedger } from '$icp/utils/ic-send.utils';
	import { authIdentity } from '$lib/derived/auth.derived';
	import type { NetworkId } from '$lib/types/network';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';
	import { isNetworkIdBitcoin } from '$lib/utils/network.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	interface Props {
		token: Token;
		amount?: OptionAmount;
		minimumAmount?: bigint;
		networkId?: NetworkId;
		children: Snippet;
	}

	let { token, amount, networkId, minimumAmount, children }: Props = $props();

	let ckBTC = $derived(isTokenCkBtcLedger(token));

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

		const parsedAmount = parseToken({
			value: `${amount}`,
			unitName: token.decimals
		});

		if (nonNullish(minimumAmount) && parsedAmount < minimumAmount) {
			store.setFee(null);
			return;
		}

		const { fee, result } = await queryEstimateFee({
			identity: $authIdentity,
			amount: parseToken({
				value: `${amount}`,
				unitName: token.decimals
			}),
			...token
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

	$effect(() => {
		[amount, networkId, token];

		untrack(() => debounceEstimateFee());
	});
</script>

{@render children()}
