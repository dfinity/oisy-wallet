import type { SignRequest } from '$declarations/backend/backend.did';
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
import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
import { isCkEthHelperContract } from '$eth/utils/send.utils';
import { isErc20Icp, isNotSupportedErc20TwinTokenId } from '$eth/utils/token.utils';
import {toCkErc20HelperContractAddress, toCkEthHelperContractAddress} from '$icp-eth/utils/cketh.utils';
import { signTransaction } from '$lib/api/backend.api';
import { DEFAULT_NETWORK } from '$lib/constants/networks.constants';
import { SendStep } from '$lib/enums/steps';
import { i18n } from '$lib/stores/i18n.store';
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
		const {
			send: {
				error: { erc20_data_undefined }
			}
		} = get(i18n);

		throw new Error(erc20_data_undefined);
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

	// TODO: deposit for erc20
	// contract: erc20_contract_address = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
	// amount !decimals
	// to == same to

	if (isNullish(data)) {
		const {
			send: {
				error: { data_undefined }
			}
		} = get(i18n);

		throw new Error(data_undefined);
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
	...rest
}: Omit<TransferParams, 'maxPriorityFeePerGas' | 'maxFeePerGas'> &
	SendParams &
	Pick<TransactionFeeData, 'gas'> & {
		maxFeePerGas: BigNumber;
		maxPriorityFeePerGas: BigNumber;
	}): Promise<{ hash: string }> => {
	// TODO: do we want to display an progress(SendStep.APPROVE); on screen?
	progress(SendStep.INITIALIZATION);

	await approve(rest);

	const transactionSent = await sendTransaction({ progress, ...rest });

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
	...rest
}: Omit<TransferParams, 'maxPriorityFeePerGas' | 'maxFeePerGas'> &
	SendParams &
	Pick<TransactionFeeData, 'gas'> & {
		maxFeePerGas: BigNumber;
		maxPriorityFeePerGas: BigNumber;
	}): Promise<{ hash: string }> => {
	const { id: networkId, chainId } = sourceNetwork;

	const { sendTransaction, getTransactionCount } = infuraProviders(networkId);

	const nonce = await getTransactionCount(from);

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

	const transaction = await (isSupportedEthTokenId(token.id)
		? nonNullish(ckEthHelperContractAddress) &&
			isCkEthHelperContract({
				destination: to,
				contractAddress: ckEthHelperContractAddress
			}) &&
			isNetworkICP(targetNetwork ?? DEFAULT_NETWORK)
			? ethContractPrepareTransaction({
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
	sourceNetwork,
	minterInfo,
	amount
}: Pick<TransferParams, 'to' | 'amount'> &
	Pick<SendParams, 'token' | 'sourceNetwork' | 'minterInfo'>) => {
	// Approve happens before send currently only for ckERC20 -> ERC20.
	// See Deposit schema: https://github.com/dfinity/ic/blob/master/rs/ethereum/cketh/docs/ckerc20.adoc
	if (isNotSupportedErc20TwinTokenId(token.id)) {
		return;
	}

	const ckEthHelperContractAddress = toCkEthHelperContractAddress(minterInfo);

	const destinationCkEth =
		nonNullish(ckEthHelperContractAddress) &&
		isCkEthHelperContract({
			destination: to,
			contractAddress: ckEthHelperContractAddress
		});

	// The Erc20 contract supports conversion to ckErc20 but, it's a standard transaction
	if (!destinationCkEth) {
		return;
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

	const { id: networkId } = sourceNetwork;

	const { approve } = infuraErc20Providers(networkId);

	await approve({
		contract: token as Erc20Token,
		address: erc20HelperContractAddress,
		amount
	});
};
