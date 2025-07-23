<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, onDestroy } from 'svelte';
	import { tokenAsIcToken, tokenWithFallbackAsIcToken } from '$icp/derived/ic-token.derived';
	import { icrcTokens } from '$icp/derived/icrc.derived';
	import { loadEip1559TransactionPrice } from '$icp/services/cketh.services';
	import { eip1559TransactionPriceStore } from '$icp/stores/cketh.store';
	import {
		ETHEREUM_FEE_CONTEXT_KEY,
		type EthereumFeeContext
	} from '$icp/stores/ethereum-fee.store';
	import type { IcToken } from '$icp/types/ic-token';
	import { isTokenCkEthLedger } from '$icp/utils/ic-send.utils';
	import { isTokenIcrcTestnet } from '$icp/utils/icrc-ledger.utils';
	import {
		isConvertCkErc20ToErc20,
		isConvertCkEthToEth
	} from '$icp-eth/utils/cketh-transactions.utils';
	import { ZERO } from '$lib/constants/app.constants';
	import { tokenId } from '$lib/derived/token.derived';
	import { token } from '$lib/stores/token.store';
	import type { NetworkId } from '$lib/types/network';

	export let networkId: NetworkId | undefined = undefined;

	let ckEthConvert = false;
	$: ckEthConvert = isConvertCkEthToEth({ token: $tokenWithFallbackAsIcToken, networkId });

	let ckErc20Convert = false;
	$: ckErc20Convert = isConvertCkErc20ToErc20({ token: $tokenWithFallbackAsIcToken, networkId });

	// This is the amount of ckETH to be burned to cover for the fees of the transaction eth_sendRawTransaction(destination_eth_address, amount) described in the withdrawal scheme.
	// It will be requested to be approved using the transaction icrc2_approve(minter, tx_fee) described in the first step of the withdrawal scheme.
	// It is fetched from the endpoint eip_1559_transaction_price of the minter. The amount is refreshed everytime there is a new pending transaction in the minter.
	// However, it is already conservatively doubled by the minter, because the minter will not allow a withdrawal if the amount of ckETH is not enough to cover the fees.
	// NOTE: the endpoint gives a timestamp of the last update too, that could come in handy.
	// For ckETH, see https://github.com/dfinity/ic/blob/master/rs/ethereum/cketh/docs/cketh.adoc#cost-of-a-withdrawal
	// For ckERC20, see https://github.com/dfinity/ic/blob/master/rs/ethereum/cketh/docs/ckerc20.adoc#withdrawal-ckerc20-to-erc20
	let maxTransactionFeeCkEth: bigint | undefined = undefined;
	$: maxTransactionFeeCkEth = nonNullish($tokenId)
		? $eip1559TransactionPriceStore?.[$tokenId]?.data.max_transaction_fee
		: undefined;

	let tokenCkEth: IcToken | undefined;
	$: tokenCkEth = $icrcTokens
		.filter(isTokenCkEthLedger)
		.find(
			(tokenCkEth) => isTokenIcrcTestnet(tokenCkEth ?? {}) === isTokenIcrcTestnet($token ?? {})
		);

	// For ckERC20, include the ckETH ledger fee for the transaction icrc2_approve(minter, tx_fee) to the ckETH ledger, described in the first step of the withdrawal scheme.
	// For ckETH, such fee is already shown in the ckETH ledger fee section, so no need to include it here.
	// See https://github.com/dfinity/ic/blob/master/rs/ethereum/cketh/docs/ckerc20.adoc#withdrawal-ckerc20-to-erc20
	let maxTransactionFeePlusLedgerApproveCkEth: bigint | undefined = undefined;
	$: maxTransactionFeePlusLedgerApproveCkEth = nonNullish(maxTransactionFeeCkEth)
		? maxTransactionFeeCkEth + (tokenCkEth?.fee ?? ZERO)
		: undefined;

	let maxTransactionFee: bigint | undefined = undefined;
	$: maxTransactionFee = ckEthConvert
		? maxTransactionFeeCkEth
		: ckErc20Convert
			? maxTransactionFeePlusLedgerApproveCkEth
			: undefined;

	const { store } = getContext<EthereumFeeContext>(ETHEREUM_FEE_CONTEXT_KEY);
	$: store.setFee({ maxTransactionFee });

	const updateContext = () => {
		if (ckEthConvert || ckErc20Convert) {
			store.setFee({ maxTransactionFee });
			return;
		}

		store.setFee(null);
	};

	$: (maxTransactionFee, updateContext());

	const loadFee = async () => {
		clearTimer();

		if (!ckEthConvert && !ckErc20Convert) {
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

	$: (networkId, (async () => await loadFee())());

	let timer: NodeJS.Timeout | undefined;

	const clearTimer = () => clearInterval(timer);

	onDestroy(clearTimer);
</script>

<slot />
