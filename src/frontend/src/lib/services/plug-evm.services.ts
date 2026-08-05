import { ETH_BASE_FEE } from '$eth/constants/eth.constants';
import { getErc20FeeData, getEthFeeDataWithProvider } from '$eth/services/fee.services';
import type { EthAddress } from '$eth/types/address';
import type { Erc20Token } from '$eth/types/erc20';
import type { EthereumNetwork } from '$eth/types/network';
import { isTokenErc20 } from '$eth/utils/erc20.utils';
import { signPlugErc20Transaction, signPlugEthTransaction } from '$lib/api/plug-helper.api';
import { ZERO } from '$lib/constants/app.constants';
import type { Token } from '$lib/types/token';
import { assertNonNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';

interface SweepParams {
	identity: Identity;
	balance: bigint;
	nativeBalance: bigint;
	destination: EthAddress;
	from: EthAddress;
	network: EthereumNetwork;
}

/**
 * Sends an imported wallet's EVM balance to the signed-in user's own address.
 *
 * The signature comes from the source wallet's helper canister — those keys are
 * threshold keys it alone can sign for — and OISY broadcasts the result through
 * its own provider, so we see the transaction hash and any RPC error directly.
 *
 * Gas is always paid in the network's native coin out of the *imported* account.
 * A native send can therefore only move `balance - gas`, and a token send needs
 * native coin sitting in that same account. Both are enforced here against live
 * fee data rather than trusted from the UI, because the fee moves between the
 * moment a row renders and the moment the user confirms.
 */
export const sweepPlugEvmBalance = async ({
	token,
	...params
}: SweepParams & { token: Token }): Promise<string> =>
	isTokenErc20(token)
		? await sweepErc20({ ...params, token })
		: await sweepNative({ ...params, token });

const feeContext = async ({
	from,
	destination,
	network: { id: networkId, chainId }
}: Pick<SweepParams, 'from' | 'destination' | 'network'>) => {
	const { feeData, provider, params } = await getEthFeeDataWithProvider({
		networkId,
		chainId,
		from,
		to: destination
	});

	const { maxFeePerGas, maxPriorityFeePerGas } = feeData;

	// Signing a transaction whose gas price is unknown risks spending the entire
	// balance on gas, so an absent ceiling has to stop the send rather than default.
	assertNonNullish(maxFeePerGas, 'No max fee per gas available for this network');
	assertNonNullish(maxPriorityFeePerGas, 'No max priority fee per gas available for this network');

	return {
		maxFeePerGas,
		maxPriorityFeePerGas,
		provider,
		params,
		nonce: BigInt(await provider.getTransactionCountPending(from))
	};
};

const sweepNative = async ({
	identity,
	balance,
	destination,
	from,
	network
}: SweepParams & { token: Token }): Promise<string> => {
	const { maxFeePerGas, maxPriorityFeePerGas, provider, nonce } = await feeContext({
		from,
		destination,
		network
	});

	const amount = balance - ETH_BASE_FEE * maxFeePerGas;

	if (amount <= ZERO) {
		throw new Error('Balance does not cover the gas for this transfer');
	}

	const signed = await signPlugEthTransaction({
		identity,
		to: destination,
		amount,
		gasLimit: ETH_BASE_FEE,
		maxFeePerGas,
		maxPriorityFeePerGas,
		nonce,
		chainId: network.chainId
	});

	const { hash } = await provider.sendTransaction(signed);

	return hash;
};

const sweepErc20 = async ({
	identity,
	token,
	balance,
	nativeBalance,
	destination,
	from,
	network
}: SweepParams & { token: Erc20Token }): Promise<string> => {
	const { maxFeePerGas, maxPriorityFeePerGas, provider, params, nonce } = await feeContext({
		from,
		destination,
		network
	});

	const gasLimit = await getErc20FeeData({
		...params,
		contract: token,
		amount: balance,
		sourceNetwork: network,
		targetNetwork: undefined
	});

	if (nativeBalance < gasLimit * maxFeePerGas) {
		throw new Error('Not enough native balance to cover the gas for this token transfer');
	}

	const signed = await signPlugErc20Transaction({
		identity,
		amount: balance,
		gasLimit,
		maxFeePerGas,
		maxPriorityFeePerGas,
		nonce,
		chainId: network.chainId,
		contractAddress: token.address,
		to: destination
	});

	const { hash } = await provider.sendTransaction(signed);

	return hash;
};
