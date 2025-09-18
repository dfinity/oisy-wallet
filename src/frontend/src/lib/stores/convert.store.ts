import { nativeEthereumTokenWithFallback } from '$eth/derived/token.derived';
import { isTokenErc20 } from '$eth/utils/erc20.utils';
import { ckEthereumNativeToken } from '$icp-eth/derived/cketh.derived';
import { ckEthMinterInfoStore, type CkEthMinterInfoData } from '$icp-eth/stores/cketh.store';
import { ethereumFeeTokenCkEth } from '$icp/derived/ethereum-fee.derived';
import { ckBtcMinterInfoStore, type CkBtcMinterInfoData } from '$icp/stores/ckbtc.store';
import {
	isTokenCkBtcLedger,
	isTokenCkErc20Ledger,
	isTokenCkEthLedger
} from '$icp/utils/ic-send.utils';
import { exchanges } from '$lib/derived/exchange.derived';
import { balancesStore } from '$lib/stores/balances.store';
import type { Balance } from '$lib/types/balance';
import type { Token } from '$lib/types/token';
import type { Option } from '$lib/types/utils';
import { derived, writable, type Readable } from 'svelte/store';

export interface ConvertData {
	sourceToken: Token;
	destinationToken: Token;
}

export const initConvertContext = (convertData: ConvertData): ConvertContext => {
	const data = writable<ConvertData>(convertData);

	const sourceToken = derived([data], ([{ sourceToken }]) => sourceToken);
	const destinationToken = derived([data], ([{ destinationToken }]) => destinationToken);

	const sourceTokenBalance = derived(
		[balancesStore, sourceToken],
		([$balancesStore, $sourceToken]) => $balancesStore?.[$sourceToken.id]?.data
	);
	const destinationTokenBalance = derived(
		[balancesStore, destinationToken],
		([$balancesStore, $destinationToken]) => $balancesStore?.[$destinationToken.id]?.data
	);

	const sourceTokenExchangeRate = derived(
		[exchanges, sourceToken],
		([$exchanges, $sourceToken]) => $exchanges?.[$sourceToken.id]?.usd
	);
	const destinationTokenExchangeRate = derived(
		[exchanges, destinationToken],
		([$exchanges, $destinationToken]) => $exchanges?.[$destinationToken.id]?.usd
	);

	const balanceForFee = derived(
		[
			sourceToken,
			balancesStore,
			nativeEthereumTokenWithFallback,
			ethereumFeeTokenCkEth,
			ckEthereumNativeToken
		],
		([
			$sourceToken,
			$balancesStore,
			$ethereumToken,
			$ethereumFeeTokenCkEth,
			$ckEthereumNativeToken
		]) =>
			isTokenErc20($sourceToken)
				? $balancesStore?.[$ethereumToken.id]?.data
				: isTokenCkErc20Ledger($sourceToken)
					? $balancesStore?.[($ethereumFeeTokenCkEth ?? $ckEthereumNativeToken).id]?.data
					: undefined
	);

	const minterInfo = derived(
		[sourceToken, ckEthMinterInfoStore, ckBtcMinterInfoStore, ckEthereumNativeToken],
		([$sourceToken, $ckEthMinterInfoStore, $ckBtcMinterInfoStore, $ckEthereumNativeToken]) =>
			isTokenCkEthLedger($sourceToken)
				? $ckEthMinterInfoStore?.[$ckEthereumNativeToken.id]
				: isTokenCkBtcLedger($sourceToken)
					? $ckBtcMinterInfoStore?.[$sourceToken.id]
					: undefined
	);

	return {
		sourceToken,
		destinationToken,
		sourceTokenBalance,
		destinationTokenBalance,
		sourceTokenExchangeRate,
		destinationTokenExchangeRate,
		balanceForFee,
		minterInfo
	};
};

export interface ConvertContext {
	sourceToken: Readable<Token>;
	destinationToken: Readable<Token>;
	sourceTokenBalance: Readable<Balance | undefined>;
	destinationTokenBalance: Readable<Balance | undefined>;
	balanceForFee: Readable<Balance | undefined>;
	sourceTokenExchangeRate: Readable<number | undefined>;
	destinationTokenExchangeRate: Readable<number | undefined>;
	minterInfo: Readable<Option<CkBtcMinterInfoData | CkEthMinterInfoData>>;
}

export const CONVERT_CONTEXT_KEY = Symbol('convert');
