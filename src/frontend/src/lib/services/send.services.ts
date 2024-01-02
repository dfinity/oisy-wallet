import type { SignRequest } from '$declarations/backend/backend.did';
import { signTransaction } from '$lib/api/backend.api';
import { ETH_BASE_FEE, ETH_CHAIN_ID } from '$lib/constants/eth.constants';
import { ETHEREUM_NETWORK } from '$lib/constants/networks.constants';
import { ETHEREUM_TOKEN_ID } from '$lib/constants/tokens.constants';
import { SendStep } from '$lib/enums/steps';
import { populateBurnTransaction } from '$lib/providers/infura-erc20-icp.providers';
import { populateTransaction } from '$lib/providers/infura-erc20.providers';
import { getTransactionCount, sendTransaction } from '$lib/providers/infura.providers';
import { processTransactionSent } from '$lib/services/transaction.services';
import { authStore } from '$lib/stores/auth.store';
import type { Erc20Token } from '$lib/types/erc20';
import type { Erc20PopulateTransaction } from '$lib/types/erc20-providers';
import type { Network } from '$lib/types/network';
import type { Token } from '$lib/types/token';
import type { TransactionFeeData } from '$lib/types/transaction';
import { isNetworkICP } from '$lib/utils/network.utils';
import { isErc20Icp } from '$lib/utils/token.utils';
import { isNullish, toNullable } from '@dfinity/utils';
import type { BigNumber } from '@ethersproject/bignumber';
import { get } from 'svelte/store';

export interface TransferParams {
	from: string;
	to: string;
	amount: BigNumber;
	maxPriorityFeePerGas: bigint;
	maxFeePerGas: bigint;
	data?: string;
}

export interface SendParams {
	progress: (step: SendStep) => void;
	lastProgressStep?: SendStep;
	token: Token;
	network?: Network | undefined;
}

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

export const send = async ({
	progress,
	lastProgressStep = SendStep.DONE,
	token,
	from,
	maxFeePerGas,
	maxPriorityFeePerGas,
	gas,
	network,
	...rest
}: Omit<TransferParams, 'maxPriorityFeePerGas' | 'maxFeePerGas'> &
	SendParams &
	Pick<TransactionFeeData, 'gas'> & {
		maxFeePerGas: BigNumber;
		maxPriorityFeePerGas: BigNumber;
	}): Promise<{ hash: string }> => {
	progress(SendStep.INITIALIZATION);

	const nonce = await getTransactionCount(from);

	const transaction = await (token.id === ETHEREUM_TOKEN_ID
		? ethPrepareTransaction({
				...rest,
				from,
				nonce,
				gas: gas?.toBigInt(),
				maxFeePerGas: maxFeePerGas.toBigInt(),
				maxPriorityFeePerGas: maxPriorityFeePerGas.toBigInt()
			})
		: erc20PrepareTransaction({
				...rest,
				from,
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

	const { identity } = get(authStore);
	const rawTransaction = await signTransaction({ identity, transaction });

	progress(SendStep.SEND);

	const transactionSent = await sendTransaction(rawTransaction);

	// Explicitly do not await to proceed in the background and allow the UI to continue
	processTransactionSent({ token, transaction: transactionSent });

	progress(lastProgressStep);

	return { hash: transactionSent.hash };
};
