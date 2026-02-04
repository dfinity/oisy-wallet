import { ETH_BASE_FEE } from '$eth/constants/eth.constants';
import { infuraErc20Providers } from '$eth/providers/infura-erc20.providers';
import type { InfuraProvider } from '$eth/providers/infura.providers';
import { getErc20FeeData, getEthFeeDataWithProvider } from '$eth/services/fee.services';
import { getNonce } from '$eth/services/nonce.services';
import { erc20PrepareTransaction, ethPrepareTransaction } from '$eth/services/send.services';
import type { EthAddress } from '$eth/types/address';
import type { GetFeeData } from '$eth/types/infura';
import type { EthFeeResult } from '$eth/types/pay';
import { isTokenErc20 } from '$eth/utils/erc20.utils';
import { isDefaultEthereumToken, isSupportedEthTokenId } from '$eth/utils/eth.utils';
import { isSupportedEvmNativeTokenId } from '$evm/utils/native-token.utils';
import { signTransaction } from '$lib/api/signer.api';
import { ZERO } from '$lib/constants/app.constants';
import { ethAddress } from '$lib/derived/address.derived';
import { ProgressStepsPayment } from '$lib/enums/progress-steps';
import { fetchOpenCryptoPay } from '$lib/rest/open-crypto-pay.rest';
import { i18n } from '$lib/stores/i18n.store';
import type {
	PayParams,
	PayableToken,
	TransactionBaseParams,
	ValidatedEthPaymentData
} from '$lib/types/open-crypto-pay';
import { maxBigInt } from '$lib/utils/bigint.utils';
import { assertIsNetworkEthereum } from '$lib/utils/network.utils';
import { getPaymentUri } from '$lib/utils/open-crypto-pay.utils';
import { parseToken } from '$lib/utils/parse.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

/**
 * Estimates gas limit for a token transfer.
 * For native ETH/EVM tokens, uses safeEstimateGas with the transfer amount.
 * For ERC20 tokens, calculates gas using getErc20FeeData.
 *
 * @returns Estimated gas limit in wei
 */
const estimateGasLimit = async ({
	token,
	params,
	safeEstimateGas
}: {
	token: PayableToken;
	params: GetFeeData;
	safeEstimateGas: InfuraProvider['safeEstimateGas'];
}): Promise<bigint | undefined> => {
	// Native ETH or EVM native token
	if (isSupportedEthTokenId(token.id) || isSupportedEvmNativeTokenId(token.id)) {
		const estimatedGas = await safeEstimateGas({
			...params,
			...(nonNullish(token.amount)
				? { value: parseToken({ value: token.amount.toString(), unitName: token.decimals }) }
				: {})
		});

		return maxBigInt(ETH_BASE_FEE, estimatedGas);
	}

	// ERC20 token
	if (!isTokenErc20(token)) {
		return;
	}

	const erc20GasFeeParams = {
		...params,
		contract: token,
		// Use '1' as default amount for ERC20 gas estimation when amount is not specified.
		// ERC20 transfer gas cost doesn't significantly vary with amount (unlike native ETH),
		// so estimating with '1' token provides accurate gas fee calculation for any transfer amount.
		amount: parseToken({ value: `${token.amount ?? '1'}`, unitName: token.decimals }),
		sourceNetwork: token.network
	};

	return await getErc20FeeData({
		...erc20GasFeeParams,
		to: erc20GasFeeParams.to,
		targetNetwork: token.network
	});
};

export const calculateEthFee = async (token: PayableToken): Promise<EthFeeResult | undefined> => {
	const address = get(ethAddress);

	if (isNullish(address)) {
		return;
	}

	const { network } = token;

	assertIsNetworkEthereum(network);

	const { feeData, provider, params } = await getEthFeeDataWithProvider({
		networkId: network.id,
		chainId: network.chainId,
		from: address,
		to: address
	});

	const { safeEstimateGas } = provider;

	const { maxFeePerGas: actualGasPrice } = feeData;

	if (isNullish(actualGasPrice)) {
		return;
	}

	const estimatedGasLimit = await estimateGasLimit({
		token,
		params,
		safeEstimateGas
	});

	if (isNullish(estimatedGasLimit)) {
		return;
	}

	// We take the maximum of the calculated gas price and the token’s minimum fee.
	// The minFee is provided by DFX, and per the documentation, we must use at least
	// this value or a higher gas price to ensure the transaction goes through.
	const gasPrice = maxBigInt(actualGasPrice, BigInt(token.minFee ?? 0));

	if (gasPrice === ZERO) {
		return;
	}

	const feeInWei = gasPrice * estimatedGasLimit;

	return { feeInWei, feeData, estimatedGasLimit };
};

export const buildTransactionBaseParams = ({
	from,
	nonce,
	validatedData
}: {
	from: EthAddress;
	nonce: number;
	validatedData: ValidatedEthPaymentData;
}): TransactionBaseParams => ({
	from,
	to: validatedData.destination,
	amount: validatedData.value,
	maxPriorityFeePerGas: validatedData.feeData.maxPriorityFeePerGas,
	maxFeePerGas: validatedData.feeData.maxFeePerGas,
	nonce,
	gas: validatedData.estimatedGasLimit,
	chainId: validatedData.ethereumChainId
});

export const payEth = async ({
	token,
	identity,
	validatedData,
	progress,
	quoteId,
	callback
}: Omit<PayParams, 'data' | 'amount'> & {
	validatedData: ValidatedEthPaymentData;
}) => {
	const address = get(ethAddress);

	if (isNullish(address)) {
		throw new Error('ETH address is not available');
	}

	const nonce = await getNonce({ from: address, networkId: token.network.id });
	const baseParams = buildTransactionBaseParams({
		from: address,
		nonce,
		validatedData
	});

	const transaction = isDefaultEthereumToken(token)
		? ethPrepareTransaction(baseParams)
		: await erc20PrepareTransaction({
				...baseParams,
				token,
				populate: infuraErc20Providers(token.network.id).populateTransaction
			});

	const rawTransaction = await signTransaction({
		identity,
		transaction,
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});

	progress(ProgressStepsPayment.PAY);

	const apiUrl = getPaymentUri({
		callback,
		quoteId,
		network: token.network.pay?.openCryptoPay ?? token.network.name,
		rawTransaction
	});

	await fetchOpenCryptoPay(apiUrl);
};
