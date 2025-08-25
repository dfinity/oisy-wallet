import type { EthSignTransactionRequest } from '$declarations/signer/signer.did';
import { ETH_BASE_FEE } from '$eth/constants/eth.constants';
import { infuraCkErc20Providers } from '$eth/providers/infura-ckerc20.providers';
import { infuraCkETHProviders } from '$eth/providers/infura-cketh.providers';
import { infuraErc20IcpProviders } from '$eth/providers/infura-erc20-icp.providers';
import { infuraErc20Providers } from '$eth/providers/infura-erc20.providers';
import { infuraProviders } from '$eth/providers/infura.providers';
import { processTransactionSent } from '$eth/services/eth-transaction.services';
import type {
	CkEthPopulateTransaction,
	Erc20PopulateTransaction
} from '$eth/types/contracts-providers';
import type { Erc20ContractAddress, Erc20Token } from '$eth/types/erc20';
import type { EthereumNetwork, NetworkChainId } from '$eth/types/network';
import type { ApproveParams, SendParams, SignAndApproveParams } from '$eth/types/send';
import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
import { isDestinationContractAddress, shouldSendWithApproval } from '$eth/utils/send.utils';
import { isErc20Icp } from '$eth/utils/token.utils';
import { isSupportedEvmNativeTokenId } from '$evm/utils/native-token.utils';
import {
	toCkErc20HelperContractAddress,
	toCkEthHelperContractAddress
} from '$icp-eth/utils/cketh.utils';
import { signTransaction } from '$lib/api/signer.api';
import { ZERO } from '$lib/constants/app.constants';
import { ProgressStepsSend } from '$lib/enums/progress-steps';
import { i18n } from '$lib/stores/i18n.store';
import type { EthAddress } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import type { TransferParams } from '$lib/types/send';
import type { RequiredTransactionFeeData } from '$lib/types/transaction';
import type { ResultSuccess } from '$lib/types/utils';
import { isNetworkICP } from '$lib/utils/network.utils';
import { encodePrincipalToEthAddress } from '@dfinity/cketh';
import { assertNonNullish, isNullish, nonNullish, toNullable } from '@dfinity/utils';
import type { TransactionResponse } from 'ethers/providers';
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
	value: amount,
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
		amount: ZERO,
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
		amount,
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
		amount: ZERO,
		...rest
	});
};

/**
 * Get the current allowance of an Erc20 contract.
 */
const erc20ContractAllowance = async ({
	token,
	owner,
	spender,
	networkId
}: {
	networkId: NetworkId;
	owner: EthAddress;
	spender: EthAddress;
} & Pick<SendParams, 'token'>): Promise<bigint> => {
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
		amount: ZERO,
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
	token,
	...rest
}: Omit<TransferParams, 'maxPriorityFeePerGas' | 'maxFeePerGas'> &
	SendParams &
	RequiredTransactionFeeData): Promise<{ hash: string }> => {
	progress?.(ProgressStepsSend.INITIALIZATION);

	const { transactionNeededApproval, nonce } = await approve({
		progress,
		progressSteps: ProgressStepsSend,
		token,
		...rest
	});

	// If we approved a transaction - as for example in Erc20 -> ckErc20 flow - then we increment the nonce for the next transaction. Otherwise, we can use the nonce we obtained.
	const nonceTransaction = transactionNeededApproval ? nonce + 1 : nonce;

	const transactionSent = await sendTransaction({
		progress,
		nonce: nonceTransaction,
		token,
		...rest
	});

	// Explicitly do not await to proceed in the background and allow the UI to continue
	processTransactionSent({ token, transaction: transactionSent });

	progress?.(lastProgressStep);

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
	RequiredTransactionFeeData & { nonce: number }): Promise<TransactionResponse> => {
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

	const transferStandard: 'ethereum' | 'erc20' =
		isSupportedEthTokenId(token.id) || isSupportedEvmNativeTokenId(token.id) ? 'ethereum' : 'erc20';

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
		gas,
		maxFeePerGas,
		maxPriorityFeePerGas,
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

	progress?.(ProgressStepsSend.SIGN_TRANSFER);

	const rawTransaction = await signTransaction({
		identity,
		transaction,
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});

	progress?.(ProgressStepsSend.TRANSFER);

	return await sendTransaction(rawTransaction);
};

const prepareAndSignApproval = async ({
	maxFeePerGas,
	maxPriorityFeePerGas,
	gas,
	sourceNetwork,
	identity,
	progressSteps = ProgressStepsSend,
	progress,
	...rest
}: SignAndApproveParams): Promise<
	ResultSuccess & {
		hash?: string;
	}
> => {
	const { id: networkId, chainId } = sourceNetwork;

	const approve = await erc20ContractPrepareApprove({
		...rest,
		gas,
		maxFeePerGas,
		maxPriorityFeePerGas,
		chainId,
		networkId
	});

	progress?.(progressSteps.SIGN_APPROVE);

	const rawTransaction = await signTransaction({ identity, transaction: approve });

	progress?.(progressSteps.APPROVE);

	const { sendTransaction } = infuraProviders(networkId);

	const { hash } = await sendTransaction(rawTransaction);

	return { success: true, hash };
};

const resetExistingApprovalToZero = async (
	params: Omit<SignAndApproveParams, 'amount'>
): Promise<
	ResultSuccess & {
		hash?: string;
	}
> =>
	await prepareAndSignApproval({
		...params,
		amount: ZERO
	});

const checkExistingApproval = async ({
	token,
	from,
	spender,
	amount,
	sourceNetwork,
	...rest
}: Omit<ApproveParams, 'to' | 'minterInfo'> & {
	nonce: number;
	spender: EthAddress;
}): Promise<'existingApprovalIsEnough' | 'approvalNeededReset' | 'noExistingApproval'> => {
	const preApprovedAmount = await erc20ContractAllowance({
		token,
		owner: from,
		spender,
		networkId: sourceNetwork.id
	});

	// If there is already an approved allowance that is enough for the required amount, we don't need to approve again.
	if (preApprovedAmount >= amount) {
		return 'existingApprovalIsEnough';
	}

	// If the existing pre-approved amount is not enough but non-null, we need to reset the allowance first, before approving the new amount.
	if (preApprovedAmount > ZERO) {
		await resetExistingApprovalToZero({
			...rest,
			token,
			sourceNetwork,
			spender
		});

		return 'approvalNeededReset';
	}

	return 'noExistingApproval';
};

export const approve = async ({
	token,
	from,
	to,
	minterInfo,
	amount,
	sourceNetwork,
	// TODO: Refactor to accept an `onProgress(step)` callback instead of requiring manual `progress(progressSteps.step)` calls
	progress,
	shouldSwapWithApproval,
	progressSteps = ProgressStepsSend,
	...rest
}: ApproveParams): Promise<{
	transactionNeededApproval: boolean;
	hash?: string;
	nonce: number;
}> => {
	// Approve happens before send currently only for ckERC20 -> ERC20.
	// See Deposit schema: https://github.com/dfinity/ic/blob/master/rs/ethereum/cketh/docs/ckerc20.adoc

	const { id: networkId } = sourceNetwork;

	const { getTransactionCount } = infuraProviders(networkId);

	const nonce = await getTransactionCount(from);

	const erc20HelperContractAddress = toCkErc20HelperContractAddress(minterInfo);

	const shouldSkipApproval = nonNullish(shouldSwapWithApproval)
		? !shouldSwapWithApproval
		: isNullish(erc20HelperContractAddress) ||
			!shouldSendWithApproval({
				to,
				tokenId: token.id,
				erc20HelperContractAddress
			});

	if (shouldSkipApproval) {
		return { transactionNeededApproval: false, nonce };
	}

	const spender = shouldSwapWithApproval ? to : erc20HelperContractAddress;

	if (isNullish(spender)) {
		return { transactionNeededApproval: false, nonce };
	}

	// We check if the existing approval (either null or non-null) is enough for the required amount. If it isn't and it's non-null, we reset it to zero.
	const approvalCheckResult = await checkExistingApproval({
		token,
		from,
		spender,
		nonce,
		amount,
		sourceNetwork,
		progress,
		...rest
	});

	if (approvalCheckResult === 'existingApprovalIsEnough') {
		progress?.(progressSteps.APPROVE);
		return { transactionNeededApproval: false, nonce };
	}

	// If we needed to reset the allowance (the pre-approved amount was not enough and not zero), we need to increment the nonce for the next transaction. Otherwise, we can use the nonce we obtained.
	const nonceApproval = approvalCheckResult === 'approvalNeededReset' ? nonce + 1 : nonce;

	const { success: transactionApproved, hash } = await prepareAndSignApproval({
		...rest,
		nonce: nonceApproval,
		amount,
		token,
		sourceNetwork,
		progress,
		spender
	});

	return { transactionNeededApproval: transactionApproved, hash, nonce: nonceApproval };
};
