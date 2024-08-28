<script lang="ts">
	import type { NetworkId } from '$lib/types/network';
	import { isTokenCkErc20Ledger, isTokenCkEthLedger } from '$icp/utils/ic-send.utils';
	import { tokenId } from '$lib/derived/token.derived';
	import type { IcToken } from '$icp/types/ic';
	import { isNetworkIdEthereum } from '$lib/utils/network.utils';
	import { eip1559TransactionPriceStore } from '$icp/stores/cketh.store';
	import { icrcTokens } from '$icp/derived/icrc.derived';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { CKERC20_TO_ERC20_MAX_TRANSACTION_FEE } from '$icp/constants/cketh.constants';
	import { loadEip1559TransactionPrice } from '$icp/services/cketh.services';
	import { getContext, onDestroy } from 'svelte';
	import {
		ETHEREUM_FEE_CONTEXT_KEY,
		type EthereumFeeContext
	} from '$icp/stores/ethereum-fee.store';
	import { token } from '$lib/stores/token.store';
	import { isTokenIcrcTestnet } from '$icp/utils/icrc-ledger.utils';
	import { tokenAsIcToken, tokenWithFallbackAsIcToken } from '$icp/derived/ic-token.derived';

	export let networkId: NetworkId | undefined = undefined;

	let ckETH = false;
	$: ckETH = isTokenCkEthLedger($tokenWithFallbackAsIcToken);

	let ckErc20 = false;
	$: ckErc20 = isTokenCkErc20Ledger($tokenWithFallbackAsIcToken);

	let ethNetwork = false;
	$: ethNetwork = isNetworkIdEthereum(networkId);

	let maxTransactionFeeEth: bigint | undefined = undefined;
	$: maxTransactionFeeEth = nonNullish($tokenId)
		? $eip1559TransactionPriceStore?.[$tokenId]?.data.max_transaction_fee
		: undefined;

	let tokenCkEth: IcToken | undefined;
	$: tokenCkEth = $icrcTokens
		.filter(isTokenCkEthLedger)
		.find(
			(tokenCkEth) => isTokenIcrcTestnet(tokenCkEth ?? {}) === isTokenIcrcTestnet($token ?? {})
		);

	let maxTransactionFeePlusEthLedgerApprove: bigint | undefined = undefined;
	$: maxTransactionFeePlusEthLedgerApprove = nonNullish(maxTransactionFeeEth)
		? maxTransactionFeeEth + CKERC20_TO_ERC20_MAX_TRANSACTION_FEE + (tokenCkEth?.fee ?? 0n)
		: undefined;

	let maxTransactionFee: bigint | undefined = undefined;
	$: maxTransactionFee =
		nonNullish(maxTransactionFeePlusEthLedgerApprove) && ckErc20
			? maxTransactionFeePlusEthLedgerApprove + CKERC20_TO_ERC20_MAX_TRANSACTION_FEE
			: maxTransactionFeePlusEthLedgerApprove;

	const { store } = getContext<EthereumFeeContext>(ETHEREUM_FEE_CONTEXT_KEY);
	$: store.setFee({ maxTransactionFee });

	const updateContext = () => {
		if ((ckETH || ckErc20) && ethNetwork) {
			store.setFee({ maxTransactionFee });
			return;
		}

		store.setFee(null);
	};

	$: maxTransactionFee, updateContext();

	const loadFee = async () => {
		clearTimer();

		if ((!ckETH && !ckErc20) || !ethNetwork) {
			updateContext();
			return;
		}

		if (isNullish($token)) {
			updateContext();
			return;
		}

		const load = async () => await loadEip1559TransactionPrice($tokenAsIcToken);

		await load();

		timer = setInterval(load, 30000);
	};

	$: networkId, (async () => await loadFee())();

	let timer: NodeJS.Timeout | undefined;

	const clearTimer = () => clearInterval(timer);

	onDestroy(clearTimer);
</script>

<slot />
