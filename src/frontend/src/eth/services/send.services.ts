import type { EthSignTransactionRequest } from '$declarations/signer/signer.did';
import { ETH_BASE_FEE } from '$eth/constants/eth.constants';
import { infuraCkErc20Providers } from '$eth/providers/infura-ckerc20.providers';
import { infuraCkETHProviders } from '$eth/providers/infura-cketh.providers';
import { infuraErc20IcpProviders } from '$eth/providers/infura-erc20-icp.providers';
import { infuraErc20Providers } from '$eth/providers/infura-erc20.providers';
import { infuraProviders } from '$eth/providers/infura.providers';
import { processTransactionSent } from '$eth/services/transaction.services';
import type {
	CkEthPopulateTransaction,
	Erc20PopulateTransaction
} from '$eth/types/contracts-providers';
import type { Erc20ContractAddress, Erc20Token } from '$eth/types/erc20';
import type { EthereumNetwork, NetworkChainId } from '$eth/types/network';
import type { SendParams } from '$eth/types/send';
import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
import { isDestinationContractAddress, shouldSendWithApproval } from '$eth/utils/send.utils';
import { isErc20Icp } from '$eth/utils/token.utils';
import {
	toCkErc20HelperContractAddress,
	toCkEthHelperContractAddress
} from '$icp-eth/utils/cketh.utils';
import { signTransaction } from '$lib/api/signer.api';
import { ProgressStepsSend } from '$lib/enums/progress-steps';
import { i18n } from '$lib/stores/i18n.store';
import type { EthAddress } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import type { TransferParams } from '$lib/types/send';
import type { TransactionFeeData } from '$lib/types/transaction';
import type { ResultSuccess } from '$lib/types/utils';
import { isNetworkICP } from '$lib/utils/network.utils';
import { encodePrincipalToEthAddress } from '@dfinity/cketh';
import { assertNonNullish, isNullish, nonNullish, toNullable } from '@dfinity/utils';
import type { BigNumber } from '@ethersproject/bignumber';
import type { TransactionResponse } from '@ethersproject/providers';
import { get } from 'svelte/store';

const ethPrepareTransaction = ({
	to,
	amount,
	maxPriorityFeePerGas: max_priority_fee_per_gas,
	maxFeePerGas: max_fee_per_gas,
	nonce,
	gas,
	data,
	chainId: chain_id
}: TransferParams &
	NetworkChainId & { nonce: number; gas: bigint | undefined }): EthSignTransactionRequest => ({
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
	} & Pick<SendParams, 'token'>): Promise<EthSignTransactionRequest> => {
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
	}): Promise<EthSignTransactionRequest> => {
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
	} & Pick<SendParams, 'token'>): Promise<EthSignTransactionRequest> => {
	const { address: erc20ContractAddress } = token as Erc20Token;

	const { populateTransaction } = infuraCkErc20Providers(networkId);

	const { data } = await populateTransaction({
		contract,
		erc20Contract: { address: erc20ContractAddress },
		to,
		amount
	});

	const { address: contractAddress } = contract;

	return prepare({
		data,
		to: contractAddress,
		amount: 0n,
		...rest
	});
};

/**
 * Get the current allowance of an Erc20 contract.
 */
// TODO: this function is still not used in the codebase, so for now we put an ESLINT exception
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const erc20ContractAllowance = async ({
	token,
	owner,
	spender,
	networkId
}: {
	networkId: NetworkId;
	owner: EthAddress;
	spender: EthAddress;
} & Pick<SendParams, 'token'>): Promise<BigNumber> => {
	const { allowance } = infuraErc20Providers(networkId);

	return await allowance({
		contract: token as Erc20Token,
		owner,
		spender
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
	spender,
	networkId,
	...rest
}: Omit<TransferParams, 'to' | 'from'> &
	NetworkChainId & {
		nonce: number;
		gas: bigint;
		networkId: NetworkId;
		spender: EthAddress;
	} & Pick<SendParams, 'token'>): Promise<EthSignTransactionRequest> => {
	const { populateApprove } = infuraErc20Providers(networkId);

	const { data } = await populateApprove({
		contract: token as Erc20Token,
		spender,
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

const prepare = ({
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
	}): EthSignTransactionRequest => {
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
	lastProgressStep = ProgressStepsSend.DONE,
	progress,
	sourceNetwork,
	token,
	from,
	...rest
}: Omit<TransferParams, 'maxPriorityFeePerGas' | 'maxFeePerGas'> &
	SendParams &
	Pick<TransactionFeeData, 'gas'> & {
		maxFeePerGas: BigNumber;
		maxPriorityFeePerGas: BigNumber;
	}): Promise<{ hash: string }> => {
	progress(ProgressStepsSend.INITIALIZATION);

	const { id: networkId } = sourceNetwork;

	const { getTransactionCount } = infuraProviders(networkId);

	const nonce = await getTransactionCount(from);

	const { transactionNeededApproval } = await approve({
		progress,
		sourceNetwork,
		nonce,
		token,
		...rest
	});

	// If we approved a transaction - as for example in Erc20 -> ckErc20 flow - then we increment the nonce for the next transaction. Otherwise, we can use the nonce we obtained.
	const nonceTransaction = transactionNeededApproval ? nonce + 1 : nonce;

	const transactionSent = await sendTransaction({
		progress,
		from,
		sourceNetwork,
		nonce: nonceTransaction,
		token,
		...rest
	});

	// Explicitly do not await to proceed in the background and allow the UI to continue
	processTransactionSent({ token, transaction: transactionSent });

	progress(lastProgressStep);

	return { hash: transactionSent.hash };
};

const sendTransaction = async ({
	progress,
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
	Omit<SendParams, 'lastProgressStep'> &
	Pick<TransactionFeeData, 'gas'> & {
		maxFeePerGas: BigNumber;
		maxPriorityFeePerGas: BigNumber;
		nonce: number;
	}): Promise<TransactionResponse> => {
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

	const ckEthHelperContractAddress = toCkEthHelperContractAddress({
		minterInfo,
		networkId: sourceNetwork.id
	});
	const ckErc20HelperContractAddress = toCkErc20HelperContractAddress(minterInfo);

	const transferStandard: 'ethereum' | 'erc20' = isSupportedEthTokenId(token.id)
		? 'ethereum'
		: 'erc20';

	const networkICP = isNetworkICP(targetNetwork);

	const convertEthToCkEth =
		transferStandard === 'ethereum' &&
		nonNullish(ckEthHelperContractAddress) &&
		isDestinationContractAddress({
			destination: to,
			contractAddress: ckEthHelperContractAddress
		}) &&
		networkICP;

	const convertErc20ToCkErc20 =
		transferStandard === 'erc20' &&
		nonNullish(ckErc20HelperContractAddress) &&
		isDestinationContractAddress({
			destination: to,
			contractAddress: ckErc20HelperContractAddress
		}) &&
		networkICP;

	const signParams: Pick<TransferParams, 'from'> &
		Pick<EthereumNetwork, 'chainId'> & {
			gas: bigint;
			nonce: number;
		} & Pick<TransferParams, 'maxFeePerGas' | 'maxPriorityFeePerGas'> = {
		from,
		nonce,
		gas: gas.toBigInt(),
		maxFeePerGas: maxFeePerGas.toBigInt(),
		maxPriorityFeePerGas: maxPriorityFeePerGas.toBigInt(),
		chainId
	};

	const transaction = await (transferStandard === 'ethereum'
		? // Case Ethereum or Sepolia
			convertEthToCkEth
			? ethHelperContractPrepareTransaction({
					...signParams,
					...rest,
					contract: { address: ckEthHelperContractAddress },
					to: principalEthAddress(),
					populate: infuraCkETHProviders(networkId).populateTransaction
				})
			: ethPrepareTransaction({
					...rest,
					...signParams,
					to
				})
		: // Case Erc20
			convertErc20ToCkErc20
			? ckErc20HelperContractPrepareTransaction({
					...rest,
					...signParams,
					contract: { address: ckErc20HelperContractAddress },
					to: principalEthAddress(),
					networkId,
					token
				})
			: erc20PrepareTransaction({
					...rest,
					...signParams,
					to,
					token,
					populate:
						isErc20Icp(token) && networkICP
							? infuraErc20IcpProviders(networkId).populateTransaction
							: infuraErc20Providers(networkId).populateTransaction
				}));

	progress(ProgressStepsSend.SIGN_TRANSFER);

	const rawTransaction = await signTransaction({
		identity,
		transaction,
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});

	progress(ProgressStepsSend.TRANSFER);

	return await sendTransaction(rawTransaction);
};

const prepareAndSignApproval = async ({
	maxFeePerGas,
	maxPriorityFeePerGas,
	gas,
	sourceNetwork,
	identity,
	progress,
	...rest
}: Omit<TransferParams, 'maxPriorityFeePerGas' | 'maxFeePerGas' | 'from' | 'to'> &
	Omit<SendParams, 'targetNetwork' | 'lastProgressStep' | 'progress' | 'minterInfo'> &
	Partial<Pick<SendParams, 'progress'>> &
	Pick<TransactionFeeData, 'gas'> & {
		maxFeePerGas: BigNumber;
		maxPriorityFeePerGas: BigNumber;
		nonce: number;
		spender: EthAddress;
	}): Promise<
	ResultSuccess & {
		hash?: string;
	}
> => {
	const { id: networkId, chainId } = sourceNetwork;

	const approve = await erc20ContractPrepareApprove({
		...rest,
		gas: gas.toBigInt(),
		maxFeePerGas: maxFeePerGas.toBigInt(),
		maxPriorityFeePerGas: maxPriorityFeePerGas.toBigInt(),
		chainId,
		networkId
	});

	progress?.(ProgressStepsSend.SIGN_APPROVE);

	const rawTransaction = await signTransaction({ identity, transaction: approve });

	progress?.(ProgressStepsSend.APPROVE);

	const { sendTransaction } = infuraProviders(networkId);

	const { hash } = await sendTransaction(rawTransaction);

	return { success: true, hash };
};

const approve = async ({
	token,
	to,
	minterInfo,
	...rest
}: Omit<TransferParams, 'maxPriorityFeePerGas' | 'maxFeePerGas' | 'from'> &
	Omit<SendParams, 'targetNetwork' | 'lastProgressStep'> &
	Pick<TransactionFeeData, 'gas'> & {
		maxFeePerGas: BigNumber;
		maxPriorityFeePerGas: BigNumber;
		nonce: number;
	}): Promise<{ transactionNeededApproval: boolean; hash?: string }> => {
	// Approve happens before send currently only for ckERC20 -> ERC20.
	// See Deposit schema: https://github.com/dfinity/ic/blob/master/rs/ethereum/cketh/docs/ckerc20.adoc
	const erc20HelperContractAddress = toCkErc20HelperContractAddress(minterInfo);

	if (
		isNullish(erc20HelperContractAddress) ||
		!shouldSendWithApproval({
			to,
			tokenId: token.id,
			erc20HelperContractAddress
		})
	) {
		return { transactionNeededApproval: false };
	}

	const { success: transactionApproved, hash } = await prepareAndSignApproval({
		...rest,
		token,
		spender: erc20HelperContractAddress
	});

	return { transactionNeededApproval: transactionApproved, hash };
};
