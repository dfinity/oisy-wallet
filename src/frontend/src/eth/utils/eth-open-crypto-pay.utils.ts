import type { EthFeeResult } from '$eth/types/pay';
import { isEthAddress } from '$eth/utils/account.utils';
import { isTokenErc20 } from '$eth/utils/erc20.utils';
import { isDefaultEthereumToken } from '$eth/utils/eth.utils';
import { calculateUsdValues, hasSufficientBalance } from '$eth/utils/token.utils';
import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import { i18n } from '$lib/stores/i18n.store';
import type { ExchangesData } from '$lib/types/exchange';
import type {
	PayableTokenWithConvertedAmount,
	PayableTokenWithFees,
	ValidatedEthPaymentData
} from '$lib/types/open-crypto-pay';
import type { DecodedUrn } from '$lib/types/qr-code';
import type { Token } from '$lib/types/token';
import { isNetworkEthereum } from '$lib/utils/network.utils';
import { parseToken } from '$lib/utils/parse.utils';
import { isEmptyString, isNullish, nonNullish } from '@dfinity/utils';
import Decimal from 'decimal.js';
import { get } from 'svelte/store';

/**
 * Enriches ETH/EVM token with USD values and validates sufficient balance.
 */
export const enrichEthEvmPayableToken = ({
	token,
	nativeTokens,
	exchanges,
	balances
}: {
	token: PayableTokenWithFees;
	nativeTokens: Token[];
	exchanges: ExchangesData | undefined;
	balances: CertifiedStoreData<BalancesData>;
}): PayableTokenWithConvertedAmount | undefined => {
	if (isNullish(token.fee)) {
		return;
	}

	// This function is specifically for ETH/EVM tokens, so we can safely cast to EthFeeResult
	const ethFee = token.fee as EthFeeResult;

	const nativeToken = nativeTokens.find(({ network: { id } }) => id === token.network.id);

	if (isNullish(nativeToken)) {
		return;
	}

	const nativeTokenPrice = exchanges?.[nativeToken.id]?.usd;
	const tokenPrice = exchanges?.[token.id]?.usd;

	if (isNullish(nativeTokenPrice) || isNullish(tokenPrice)) {
		return;
	}

	const tokenAmount = parseToken({
		value: token.amount,
		unitName: token.decimals
	});

	const isBalanceSufficient = hasSufficientBalance({
		token,
		tokenAmount,
		feeInWei: ethFee.feeInWei,
		nativeToken,
		balances
	});

	if (!isBalanceSufficient) {
		return;
	}

	const usdValues = calculateUsdValues({
		token,
		nativeToken,
		feeInWei: ethFee.feeInWei,
		tokenPrice,
		nativeTokenPrice
	});

	return {
		...token,
		...usdValues
	};
};

export const getERC681Value = (uri: string): bigint | undefined => {
	try {
		const params = new URLSearchParams(uri.split('?')[1] || '');
		const value = params.get('value') ?? params.get('uint256');

		if (isEmptyString(value)) {
			return;
		}

		if (value.includes('e') || value.includes('E') || value.includes('.')) {
			const decimal = new Decimal(value);

			if (!decimal.isFinite()) {
				return;
			}

			return BigInt(decimal.toString());
		}

		return BigInt(value);
	} catch (_: unknown) {
		// If it is not parseable, we can handle a nullish value
	}
};

export const validateEthEvmTransfer = ({
	decodedData,
	amount,
	token,
	uri
}: {
	decodedData: DecodedUrn;
	amount: bigint;
	token: PayableTokenWithConvertedAmount;
	uri: string;
}): ValidatedEthPaymentData => {
	const ethFee = token.fee as EthFeeResult;
	const { feeData, estimatedGasLimit } = ethFee ?? {};

	if (
		isNullish(decodedData) ||
		isNullish(feeData?.maxFeePerGas) ||
		isNullish(feeData?.maxPriorityFeePerGas) ||
		isNullish(estimatedGasLimit)
	) {
		throw new Error(get(i18n).scanner.error.data_is_incompleted);
	}

	const params = {
		decodedData,
		amount,
		maxFeePerGas: feeData.maxFeePerGas,
		maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
		estimatedGasLimit,
		token,
		uri
	};

	return isDefaultEthereumToken(token)
		? validateNativeTransfer(params)
		: validateERC20Transfer(params);
};

const validateNativeTransfer = ({
	decodedData,
	amount,
	maxFeePerGas,
	maxPriorityFeePerGas,
	estimatedGasLimit,
	token,
	uri
}: {
	decodedData: DecodedUrn;
	amount: bigint;
	token: PayableTokenWithConvertedAmount;
	maxFeePerGas: bigint;
	maxPriorityFeePerGas: bigint;
	estimatedGasLimit: bigint;
	uri: string;
}): ValidatedEthPaymentData => {
	const { functionName, destination } = decodedData;
	const dfxValue = getERC681Value(uri);

	const {
		pay: {
			error: { data_is_incompleted, amount_does_not_match, recipient_address_is_not_valid }
		}
	} = get(i18n);

	if (
		!isNetworkEthereum(token.network) ||
		isNullish(destination) ||
		nonNullish(functionName) ||
		isNullish(dfxValue)
	) {
		throw new Error(data_is_incompleted);
	}

	if (amount !== dfxValue) {
		throw new Error(amount_does_not_match);
	}

	if (!isEthAddress(destination)) {
		throw new Error(recipient_address_is_not_valid);
	}

	return {
		destination,
		feeData: {
			maxFeePerGas,
			maxPriorityFeePerGas
		},
		estimatedGasLimit,
		value: amount,
		ethereumChainId: token.network.chainId
	};
};

const validateERC20Transfer = ({
	decodedData,
	token,
	amount,
	maxFeePerGas,
	maxPriorityFeePerGas,
	estimatedGasLimit,
	uri
}: {
	decodedData: DecodedUrn;
	token: PayableTokenWithConvertedAmount;
	amount: bigint;
	maxFeePerGas: bigint;
	maxPriorityFeePerGas: bigint;
	estimatedGasLimit: bigint;
	uri: string;
}): ValidatedEthPaymentData => {
	const { destination, address } = decodedData;
	const dfxValue = getERC681Value(uri);

	const {
		pay: {
			error: {
				data_is_incompleted,
				amount_does_not_match,
				recipient_address_is_not_valid,
				token_address_mismatch
			}
		}
	} = get(i18n);

	if (!isTokenErc20(token) || isNullish(destination) || isNullish(address) || isNullish(dfxValue)) {
		throw new Error(data_is_incompleted);
	}

	const tokenContractAddress = token.address.toLowerCase();
	const urnContractAddress = destination.toLowerCase();

	if (tokenContractAddress !== urnContractAddress) {
		throw new Error(token_address_mismatch);
	}

	if (amount !== dfxValue) {
		throw new Error(amount_does_not_match);
	}

	if (!isEthAddress(address)) {
		throw new Error(recipient_address_is_not_valid);
	}

	return {
		destination: address,
		feeData: {
			maxFeePerGas,
			maxPriorityFeePerGas
		},
		estimatedGasLimit,
		ethereumChainId: token.network.chainId,
		value: amount
	};
};
