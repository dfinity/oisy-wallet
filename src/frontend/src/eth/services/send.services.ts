import type { SignRequest } from '$declarations/backend/backend.did';
import { ETH_BASE_FEE, ETH_CHAIN_ID } from '$eth/constants/eth.constants';
import { ETHEREUM_NETWORK } from '$eth/constants/networks.constants';
import { populateDepositTransaction } from '$eth/providers/infura-cketh.providers';
import { populateBurnTransaction } from '$eth/providers/infura-erc20-icp.providers';
import { populateTransaction } from '$eth/providers/infura-erc20.providers';
import { getTransactionCount, sendTransaction } from '$eth/providers/infura.providers';
import type {
	CkEthPopulateTransaction,
	Erc20PopulateTransaction
} from '$eth/types/contracts-providers';
import type { Erc20ContractAddress, Erc20Token } from '$eth/types/erc20';
import type { SendParams } from '$eth/types/send';
import { isCkEthHelperContract } from '$eth/utils/send.utils';
import { isErc20Icp } from '$eth/utils/token.utils';
import { signTransaction } from '$lib/api/backend.api';
import { ETHEREUM_TOKEN_ID } from '$lib/constants/tokens.constants';
import { SendStep } from '$lib/enums/steps';
import type { TransferParams } from '$lib/types/send';
import type { TransactionFeeData } from '$lib/types/transaction';
import { isNetworkICP } from '$lib/utils/network.utils';
import { encodePrincipalToEthAddress } from '@dfinity/cketh';
import { assertNonNullish, isNullish, nonNullish, toNullable } from '@dfinity/utils';
import type { BigNumber } from '@ethersproject/bignumber';
import { processTransactionSent } from './transaction.services';

const ethPrepareTransaction = async ({
	to,
	amount,
	maxPriorityFeePerGas: max_priority_fee_per_gas,
	maxFeePerGas: max_fee_per_gas,
	nonce,
	gas,
	data
}: TransferParams & { nonce: number; gas: bigint | undefined }): Promise<SignRequest> => ({
	to,
	value: amount.toBigInt(),
	chain_id: ETH_CHAIN_ID,
	nonce: BigInt(nonce),
	gas: gas ?? ETH_BASE_FEE,
	max_fee_per_gas,
	max_priority_fee_per_gas,
	data: toNullable(data)
});

const erc20PrepareTransaction = async ({
	to,
	amount,
	maxPriorityFeePerGas: max_priority_fee_per_gas,
	maxFeePerGas: max_fee_per_gas,
	nonce,
	token,
	gas,
	populate
}: TransferParams & { nonce: number; gas: bigint; populate: Erc20PopulateTransaction } & Pick<
		SendParams,
		'token'
	>): Promise<SignRequest> => {
	const { data } = await populate({
		contract: token as Erc20Token,
		to,
		amount
	});

	if (isNullish(data)) {
		throw new Error('Erc20 transaction Data cannot be undefined or null.');
	}

	const { address: contractAddress } = token as Erc20Token;

	return {
		to: contractAddress,
		chain_id: ETH_CHAIN_ID,
		nonce: BigInt(nonce),
		gas,
		max_fee_per_gas,
		max_priority_fee_per_gas,
		value: 0n,
		data: [data]
	};
};

const ethContractPrepareTransaction = async ({
	contract,
	to,
	amount,
	maxPriorityFeePerGas: max_priority_fee_per_gas,
	maxFeePerGas: max_fee_per_gas,
	nonce,
	gas,
	populate
}: TransferParams & {
	nonce: number;
	gas: bigint;
	populate: CkEthPopulateTransaction;
	contract: Erc20ContractAddress;
}): Promise<SignRequest> => {
	const { data } = await populate({
		contract,
		to
	});

	if (isNullish(data)) {
		throw new Error('Erc20 transaction Data cannot be undefined or null.');
	}

	const { address: contractAddress } = contract;

	return {
		to: contractAddress,
		chain_id: ETH_CHAIN_ID,
		nonce: BigInt(nonce),
		gas,
		max_fee_per_gas,
		max_priority_fee_per_gas,
		value: amount.toBigInt(),
		data: [data]
	};
};

export const send = async ({
	progress,
	lastProgressStep = SendStep.DONE,
	token,
	from,
	to,
	maxFeePerGas,
	maxPriorityFeePerGas,
	gas,
	network,
	identity,
	ckEthHelperContractAddress,
	...rest
}: Omit<TransferParams, 'maxPriorityFeePerGas' | 'maxFeePerGas'> &
	SendParams &
	Pick<TransactionFeeData, 'gas'> & {
		maxFeePerGas: BigNumber;
		maxPriorityFeePerGas: BigNumber;
	}): Promise<{ hash: string }> => {
	progress(SendStep.INITIALIZATION);

	const nonce = await getTransactionCount(from);

	const principalEthAddress = (): string => {
		assertNonNullish(identity, 'No identity provided to calculate the fee for its principal.');
		return encodePrincipalToEthAddress(identity.getPrincipal());
	};

	const transaction = await (token.id === ETHEREUM_TOKEN_ID
		? nonNullish(ckEthHelperContractAddress) &&
			isCkEthHelperContract({
				destination: to,
				helperContractAddress: ckEthHelperContractAddress
			}) &&
			isNetworkICP(network ?? ETHEREUM_NETWORK)
			? ethContractPrepareTransaction({
					...rest,
					contract: { address: ckEthHelperContractAddress.data },
					from,
					to: principalEthAddress(),
					nonce,
					gas: gas.toBigInt(),
					maxFeePerGas: maxFeePerGas.toBigInt(),
					maxPriorityFeePerGas: maxPriorityFeePerGas.toBigInt(),
					populate: populateDepositTransaction
				})
			: ethPrepareTransaction({
					...rest,
					from,
					to,
					nonce,
					gas: gas?.toBigInt(),
					maxFeePerGas: maxFeePerGas.toBigInt(),
					maxPriorityFeePerGas: maxPriorityFeePerGas.toBigInt()
				})
		: erc20PrepareTransaction({
				...rest,
				from,
				to,
				token,
				nonce,
				gas: gas.toBigInt(),
				maxFeePerGas: maxFeePerGas.toBigInt(),
				maxPriorityFeePerGas: maxPriorityFeePerGas.toBigInt(),
				populate:
					isErc20Icp(token) && isNetworkICP(network ?? ETHEREUM_NETWORK)
						? populateBurnTransaction
						: populateTransaction
			}));

	progress(SendStep.SIGN);

	const rawTransaction = await signTransaction({ identity, transaction });

	progress(SendStep.SEND);

	const transactionSent = await sendTransaction(rawTransaction);

	// Explicitly do not await to proceed in the background and allow the UI to continue
	processTransactionSent({ token, transaction: transactionSent });

	progress(lastProgressStep);

	return { hash: transactionSent.hash };
};
