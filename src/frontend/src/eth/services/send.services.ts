import type { SignRequest } from '$declarations/backend/backend.did';
import { ETH_BASE_FEE } from '$eth/constants/eth.constants';
import { infuraCkErc20Providers } from '$eth/providers/infura-ckerc20.providers';
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
import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
import { isDestinationContractAddress } from '$eth/utils/send.utils';
import { isErc20Icp, isNotSupportedErc20TwinTokenId } from '$eth/utils/token.utils';
import {
	toCkErc20HelperContractAddress,
	toCkEthHelperContractAddress
} from '$icp-eth/utils/cketh.utils';
import { signTransaction } from '$lib/api/backend.api';
import { DEFAULT_NETWORK } from '$lib/constants/networks.constants';
import { SendStep } from '$lib/enums/steps';
import { i18n } from '$lib/stores/i18n.store';
import type { ETH_ADDRESS } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import type { TransferParams } from '$lib/types/send';
import type { TransactionFeeData } from '$lib/types/transaction';
import { isNetworkICP } from '$lib/utils/network.utils';
import { encodePrincipalToEthAddress } from '@dfinity/cketh';
import { assertNonNullish, isNullish, nonNullish, toNullable } from '@dfinity/utils';
import type { BigNumber } from '@ethersproject/bignumber';
import { get } from 'svelte/store';
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
	token,
	populate,
	...rest
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
		const {
			send: {
				error: { erc20_data_undefined }
			}
		} = get(i18n);

		throw new Error(erc20_data_undefined);
	}

	const { address: contractAddress } = token as Erc20Token;

	return prepare({
		data,
		to: contractAddress,
		amount: 0n,
		...rest
	});
};

const ethHelperContractPrepareTransaction = async ({
	contract,
	to,
	amount,
	populate,
	...rest
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
		const {
			send: {
				error: { data_undefined }
			}
		} = get(i18n);

		throw new Error(data_undefined);
	}

	const { address: contractAddress } = contract;

	return prepare({
		data,
		to: contractAddress,
		amount: amount.toBigInt(),
		...rest
	});
};

/**
 * {@link https://github.com/dfinity/ic/blob/master/rs/ethereum/cketh/docs/ckerc20.adoc#deposit-erc20-to-ckerc20}
 */
const ckErc20HelperContractPrepareTransaction = async ({
	contract,
	to,
	amount,
	networkId,
	token,
	...rest
}: TransferParams &
	NetworkChainId & {
		nonce: number;
		gas: bigint;
		contract: Erc20ContractAddress;
		networkId: NetworkId;
	} & Pick<SendParams, 'token'>): Promise<SignRequest> => {
	// TODO: remove once tested
	// contract: erc20_contract_address = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
	// amount !decimals
	// to == same to

	const { address: erc20ContractAddress } = token as Erc20Token;

	const { populateTransaction } = infuraCkErc20Providers(networkId);

	const { data } = await populateTransaction({
		contract,
		erc20Contract: { address: erc20ContractAddress },
		to,
		amount
	});

	return prepare({
		data,
		to,
		amount: 0n,
		...rest
	});
};

/**
 * Prepare an Erc20 contract to approve a transaction from another contract (address).
 * i.e. tell an Erc20 contract to approve a transaction from the ckErc20 helper.
 *
 * {@link https://github.com/dfinity/ic/blob/master/rs/ethereum/cketh/docs/ckerc20.adoc#deposit-erc20-to-ckerc20}
 */
const erc20ContractPrepareApprove = async ({
	amount,
	token,
	address,
	networkId,
	...rest
}: Omit<TransferParams, 'to' | 'from'> &
	NetworkChainId & {
		nonce: number;
		gas: bigint;
		networkId: NetworkId;
		address: ETH_ADDRESS;
	} & Pick<SendParams, 'token'>): Promise<SignRequest> => {
	const { populateApprove } = infuraErc20Providers(networkId);

	const { data } = await populateApprove({
		contract: token as Erc20Token,
		address,
		amount
	});

	const { address: to } = token as Erc20Token;

	return prepare({
		data,
		to,
		amount: 0n,
		...rest
	});
};

const prepare = async ({
	maxPriorityFeePerGas: max_priority_fee_per_gas,
	maxFeePerGas: max_fee_per_gas,
	nonce,
	gas,
	chainId: chain_id,
	data,
	to,
	amount
}: Omit<TransferParams, 'amount' | 'from'> &
	NetworkChainId & {
		nonce: number;
		gas: bigint;
		amount: bigint;
	}): Promise<SignRequest> => {
	if (isNullish(data)) {
		const {
			send: {
				error: { erc20_data_undefined }
			}
		} = get(i18n);

		throw new Error(erc20_data_undefined);
	}

	return {
		to,
		chain_id,
		nonce: BigInt(nonce),
		gas,
		max_fee_per_gas,
		max_priority_fee_per_gas,
		value: amount,
		data: [data]
	};
};

export const send = async ({
	progress,
	sourceNetwork,
	from,
	...rest
}: Omit<TransferParams, 'maxPriorityFeePerGas' | 'maxFeePerGas'> &
	SendParams &
	Pick<TransactionFeeData, 'gas'> & {
		maxFeePerGas: BigNumber;
		maxPriorityFeePerGas: BigNumber;
	}): Promise<{ hash: string }> => {
	// TODO: do we want to display an progress(SendStep.APPROVE); on screen? yes we want
	progress(SendStep.INITIALIZATION);

	const { id: networkId } = sourceNetwork;

	const { getTransactionCount } = infuraProviders(networkId);

	const nonce = await getTransactionCount(from);

	const { transactionApproved } = await approve({ sourceNetwork, nonce, ...rest });

	// If we approved a transaction - as for example in Erc20 -> ckErc20 flow - then we increment the nonce for the next transaction. Otherwise, we can use the nonce we obtained.
	const nonceTransaction = transactionApproved ? nonce + 1 : nonce;

	const transactionSent = await sendTransaction({
		progress,
		from,
		sourceNetwork,
		nonce: nonceTransaction,
		...rest
	});

	return { hash: transactionSent.hash };
};

const sendTransaction = async ({
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
	minterInfo,
	nonce,
	...rest
}: Omit<TransferParams, 'maxPriorityFeePerGas' | 'maxFeePerGas'> &
	SendParams &
	Pick<TransactionFeeData, 'gas'> & {
		maxFeePerGas: BigNumber;
		maxPriorityFeePerGas: BigNumber;
		nonce: number;
	}): Promise<{ hash: string }> => {
	const { id: networkId, chainId } = sourceNetwork;

	const { sendTransaction } = infuraProviders(networkId);

	const principalEthAddress = (): string => {
		const {
			send: {
				error: { no_identity_calculate_fee }
			}
		} = get(i18n);

		assertNonNullish(identity, no_identity_calculate_fee);
		return encodePrincipalToEthAddress(identity.getPrincipal());
	};

	const ckEthHelperContractAddress = toCkEthHelperContractAddress(minterInfo);
	const ckErc20HelperContractAddress = toCkErc20HelperContractAddress(minterInfo);

	const transaction = await (isSupportedEthTokenId(token.id)
		? // Case Ethereum or Sepolia
			nonNullish(ckEthHelperContractAddress) &&
			isDestinationContractAddress({
				destination: to,
				contractAddress: ckEthHelperContractAddress
			}) &&
			isNetworkICP(targetNetwork ?? DEFAULT_NETWORK)
			? ethHelperContractPrepareTransaction({
					...rest,
					contract: { address: ckEthHelperContractAddress },
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
		: // Case Erc20
			nonNullish(ckErc20HelperContractAddress) &&
			  isDestinationContractAddress({
					destination: to,
					contractAddress: ckErc20HelperContractAddress
			  }) &&
			  isNetworkICP(targetNetwork ?? DEFAULT_NETWORK)
			? ckErc20HelperContractPrepareTransaction({
					...rest,
					contract: { address: ckErc20HelperContractAddress },
					from,
					to: principalEthAddress(),
					nonce,
					gas: gas.toBigInt(),
					maxFeePerGas: maxFeePerGas.toBigInt(),
					maxPriorityFeePerGas: maxPriorityFeePerGas.toBigInt(),
					chainId,
					networkId,
					token
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

const approve = async ({
	token,
	to,
	maxFeePerGas,
	maxPriorityFeePerGas,
	gas,
	sourceNetwork,
	identity,
	minterInfo,
	nonce,
	...rest
}: Omit<TransferParams, 'maxPriorityFeePerGas' | 'maxFeePerGas' | 'from'> &
	Omit<SendParams, 'targetNetwork' | 'lastProgressStep' | 'progress'> &
	Pick<TransactionFeeData, 'gas'> & {
		maxFeePerGas: BigNumber;
		maxPriorityFeePerGas: BigNumber;
		nonce: number;
	}): Promise<{ transactionApproved: boolean; hash?: string }> => {
	// Approve happens before send currently only for ckERC20 -> ERC20.
	// See Deposit schema: https://github.com/dfinity/ic/blob/master/rs/ethereum/cketh/docs/ckerc20.adoc
	if (isNotSupportedErc20TwinTokenId(token.id)) {
		return { transactionApproved: false };
	}

	const ckEthHelperContractAddress = toCkEthHelperContractAddress(minterInfo);

	const destinationCkEth =
		nonNullish(ckEthHelperContractAddress) &&
		isDestinationContractAddress({
			destination: to,
			contractAddress: ckEthHelperContractAddress
		});

	// The Erc20 contract supports conversion to ckErc20 but, it's a standard transaction
	if (!destinationCkEth) {
		return { transactionApproved: false };
	}

	const erc20HelperContractAddress = toCkErc20HelperContractAddress(minterInfo);

	if (isNullish(erc20HelperContractAddress)) {
		const {
			send: {
				error: { erc20_helper_contract_address_undefined }
			}
		} = get(i18n);

		throw new Error(erc20_helper_contract_address_undefined);
	}

	// TODO: remove after test
	// helper_contract erc20_helper_contract_address = opt "0xE1788E4834c896F1932188645cc36c54d1b80AC1";
	// amount !decimals

	const { id: networkId, chainId } = sourceNetwork;

	const approve = await erc20ContractPrepareApprove({
		...rest,
		nonce,
		gas: gas.toBigInt(),
		maxFeePerGas: maxFeePerGas.toBigInt(),
		maxPriorityFeePerGas: maxPriorityFeePerGas.toBigInt(),
		chainId,
		networkId,
		token,
		address: erc20HelperContractAddress
	});

	const rawTransaction = await signTransaction({ identity, transaction: approve });

	const { sendTransaction } = infuraProviders(networkId);

	const { hash } = await sendTransaction(rawTransaction);

	return { transactionApproved: true, hash };
};
