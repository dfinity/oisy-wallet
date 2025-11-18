import type { EthSignTransactionRequest } from '$declarations/signer/declarations/signer.did';
import { infuraErc20Providers } from '$eth/providers/infura-erc20.providers';
import { infuraProviders } from '$eth/providers/infura.providers';
import { getNonce } from '$eth/services/nonce.services';
import { prepare } from '$eth/services/prepare.services';
import type { EthAddress } from '$eth/types/address';
import type { Erc20Token } from '$eth/types/erc20';
import type { NetworkChainId } from '$eth/types/network';
import type { ApproveParams, SendParams, SignAndApproveParams } from '$eth/types/send';
import { shouldSendWithApproval } from '$eth/utils/send.utils';
import { toCkErc20HelperContractAddress } from '$icp-eth/utils/cketh.utils';
import { signTransaction } from '$lib/api/signer.api';
import { ZERO } from '$lib/constants/app.constants';
import { ProgressStepsSend } from '$lib/enums/progress-steps';
import type { NetworkId } from '$lib/types/network';
import type { TransferParams } from '$lib/types/send';
import type { ResultSuccess } from '$lib/types/utils';
import { isNullish, nonNullish } from '@dfinity/utils';

/**
 * Get the current allowance of an Erc20 contract.
 */
export const erc20ContractAllowance = async ({
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

	// If the existing pre-approved amount is not enough but non-null, we need to reset the allowance first before approving the new amount.
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
	customNonce,
	sourceNetwork,
	// TODO: Refactor to accept an `onProgress(step)` callback instead of requiring manual `progress(progressSteps.step)` calls
	progress,
	shouldSwapWithApproval,
	progressSteps = ProgressStepsSend,
	...rest
}: ApproveParams & {
	customNonce?: number;
}): Promise<{
	transactionNeededApproval: boolean;
	hash?: string;
	nonce: number;
}> => {
	// Approve happens before send currently only for ckERC20 -> ERC20.
	// See Deposit schema: https://github.com/dfinity/ic/blob/master/rs/ethereum/cketh/docs/ckerc20.adoc

	const { id: networkId } = sourceNetwork;

	const nonce = customNonce ?? (await getNonce({ from, networkId }));

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

	// We check if the existing approval (either null or non-null) is enough for the required amount. If it isn't, and it's non-null, we reset it to zero.
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

	// If we needed to reset the allowance (the pre-approved amount was not enough and not zero), we need to increment the nonce for the next transaction. Otherwise, we can use the nonce we got.
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
