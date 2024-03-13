import type { SignRequest } from '$declarations/backend/backend.did';
import { ETHEREUM_TOKEN_IDS } from '$env/tokens.env';
import { ETH_BASE_FEE } from '$eth/constants/eth.constants';
import { infuraCkETHProviders } from '$eth/providers/infura-cketh.providers';
import { infuraErc20IcpProviders } from '$eth/providers/infura-erc20-icp.providers';
import { infuraErc20Providers } from '$eth/providers/infura-erc20.providers';
import { infuraProviders } from '$eth/providers/infura.providers';
import type {
	CkEthPopulateTransaction,
	Erc20PopulateTransaction
} from '$eth/types/contracts-providers';
import type { Erc20ContractAddress, Erc20Token } from '$eth/types/erc20';
import type { NetworkChainId } from '$eth/types/network';
import type { SendParams } from '$eth/types/send';
import { isCkEthHelperContract } from '$eth/utils/send.utils';
import { isErc20Icp } from '$eth/utils/token.utils';
import { signTransaction } from '$lib/api/backend.api';
import { DEFAULT_NETWORK } from '$lib/constants/networks.constants';
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
	data,
	chainId: chain_id
}: TransferParams &
	NetworkChainId & { nonce: number; gas: bigint | undefined }): Promise<SignRequest> => ({
	to,
	value: amount.toBigInt(),
	chain_id,
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
	populate,
	chainId: chain_id
}: TransferParams &
	NetworkChainId & {
		nonce: number;
		gas: bigint;
		populate: Erc20PopulateTransaction;
	} & Pick<SendParams, 'token'>): Promise<SignRequest> => {
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
		chain_id,
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
	populate,
	chainId: chain_id
}: TransferParams &
	NetworkChainId & {
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
		chain_id,
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
	sourceNetwork,
	targetNetwork,
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

	const { id: networkId, chainId } = sourceNetwork;

	const { sendTransaction, getTransactionCount } = infuraProviders(networkId);

	const nonce = await getTransactionCount(from);

	const principalEthAddress = (): string => {
		assertNonNullish(identity, 'No identity provided to calculate the fee for its principal.');
		return encodePrincipalToEthAddress(identity.getPrincipal());
	};

	const transaction = await (ETHEREUM_TOKEN_IDS.includes(token.id)
		? nonNullish(ckEthHelperContractAddress) &&
			isCkEthHelperContract({
				destination: to,
				helperContractAddress: ckEthHelperContractAddress
			}) &&
			isNetworkICP(targetNetwork ?? DEFAULT_NETWORK)
			? ethContractPrepareTransaction({
					...rest,
					contract: { address: ckEthHelperContractAddress.data },
					from,
					to: principalEthAddress(),
					nonce,
					gas: gas.toBigInt(),
					maxFeePerGas: maxFeePerGas.toBigInt(),
					maxPriorityFeePerGas: maxPriorityFeePerGas.toBigInt(),
					populate: infuraCkETHProviders(networkId).populateTransaction,
					chainId
				})
			: ethPrepareTransaction({
					...rest,
					from,
					to,
					nonce,
					gas: gas?.toBigInt(),
					maxFeePerGas: maxFeePerGas.toBigInt(),
					maxPriorityFeePerGas: maxPriorityFeePerGas.toBigInt(),
					chainId
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
					isErc20Icp(token) && isNetworkICP(targetNetwork ?? DEFAULT_NETWORK)
						? infuraErc20IcpProviders(networkId).populateTransaction
						: infuraErc20Providers(networkId).populateTransaction,
				chainId
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
