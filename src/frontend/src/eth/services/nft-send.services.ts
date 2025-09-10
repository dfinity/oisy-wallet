import type { EthSignTransactionRequest } from '$declarations/signer/signer.did';
import { ERC1155_ABI } from '$eth/constants/erc1155.constants';
import { ERC721_ABI } from '$eth/constants/erc721.constants';
import { infuraProviders } from '$eth/providers/infura.providers';
import type { EthereumNetwork } from '$eth/types/network';
import { signTransaction } from '$lib/api/signer.api';
import { ZERO } from '$lib/constants/app.constants';
import {
	ProgressStepsSend as ProgressStepsSendEnum,
	type ProgressStepsSend
} from '$lib/enums/progress-steps';
import type { EthAddress } from '$lib/types/address';
import type { OptionIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import type { Identity } from '@dfinity/agent';
import { Interface } from 'ethers/abi';
import type { TransactionResponse } from 'ethers/providers';

export interface CommonNftTransferParams {
	sourceNetwork: EthereumNetwork;
	identity: Identity;
	from: EthAddress;
	gas: bigint;
	maxFeePerGas: bigint;
	maxPriorityFeePerGas: bigint;
	progress?: (step: ProgressStepsSend) => void;
}

export interface TransferErc721Params extends CommonNftTransferParams {
	contractAddress: string;
	tokenId: number;
	to: EthAddress;
}

export interface TransferErc1155Params extends CommonNftTransferParams {
	contractAddress: string;
	id: number;
	amount: bigint;
	to: EthAddress;
	data?: `0x${string}` | string;
}

export interface PreparedContractCall {
	to: EthAddress;
	data: `0x${string}` | string;
}

export const encodeErc721SafeTransfer = ({
	contractAddress,
	from,
	to,
	tokenId
}: {
	contractAddress: string;
	from: EthAddress;
	to: EthAddress;
	tokenId: number;
}): PreparedContractCall => {
	const encoded = new Interface(ERC721_ABI).encodeFunctionData('safeTransferFrom', [
		from,
		to,
		BigInt(tokenId)
	]) as `0x${string}`;

	return { to: contractAddress, data: encoded };
};

export const encodeErc1155SafeTransfer = ({
	contractAddress,
	from,
	to,
	tokenId,
	amount,
	data = '0x'
}: {
	contractAddress: string;
	from: EthAddress;
	to: EthAddress;
	tokenId: number;
	amount: bigint;
	data?: `0x${string}` | string;
}): PreparedContractCall => {
	const encoded = new Interface(ERC1155_ABI).encodeFunctionData('safeTransferFrom', [
		from,
		to,
		BigInt(tokenId),
		BigInt(amount),
		data
	]) as `0x${string}`;

	return { to: contractAddress, data: encoded };
};

const buildSignRequest = ({
	call: { to, data },
	nonce,
	chainId,
	gas,
	maxFeePerGas,
	maxPriorityFeePerGas,
	value = ZERO
}: {
	call: PreparedContractCall;
	nonce: number;
	chainId: bigint;
	gas: bigint;
	maxFeePerGas: bigint;
	maxPriorityFeePerGas: bigint;
	value?: bigint;
}): EthSignTransactionRequest => ({
	to,
	chain_id: chainId,
	nonce: BigInt(nonce),
	gas,
	max_fee_per_gas: maxFeePerGas,
	max_priority_fee_per_gas: maxPriorityFeePerGas,
	value,
	data: [data]
});

const signWithIdentity = ({
	identity,
	transaction
}: {
	identity: OptionIdentity;
	transaction: EthSignTransactionRequest;
}): Promise<string> => signTransaction({ identity, transaction });

const sendRaw = ({
	networkId,
	raw
}: {
	networkId: NetworkId;
	raw: string;
}): Promise<TransactionResponse> => infuraProviders(networkId).sendTransaction(raw);

export const transferErc721 = async ({
	identity,
	sourceNetwork,
	to,
	from,
	tokenId,
	contractAddress,
	gas,
	maxFeePerGas,
	maxPriorityFeePerGas,
	progress
}: TransferErc721Params): Promise<TransactionResponse> => {
	const call = encodeErc721SafeTransfer({ contractAddress, from, to, tokenId });
	const { id: networkId, chainId } = sourceNetwork;
	const nonce = await infuraProviders(networkId).getTransactionCount(from);

	const tx = buildSignRequest({
		call,
		nonce,
		chainId,
		gas,
		maxFeePerGas,
		maxPriorityFeePerGas
	});

	progress?.(ProgressStepsSendEnum.SIGN_TRANSFER);

	const raw = await signWithIdentity({ identity, transaction: tx });
	const result = await sendRaw({ networkId, raw });

	progress?.(ProgressStepsSendEnum.TRANSFER);

	return result;
};

export const transferErc1155 = async ({
	identity,
	sourceNetwork,
	to,
	from,
	id,
	amount,
	contractAddress,
	gas,
	maxFeePerGas,
	maxPriorityFeePerGas,
	data,
	progress
}: TransferErc1155Params): Promise<TransactionResponse> => {
	const call = encodeErc1155SafeTransfer({
		contractAddress,
		from,
		to,
		tokenId: id,
		amount,
		data
	});
	const { id: networkId, chainId } = sourceNetwork;
	const nonce = await infuraProviders(networkId).getTransactionCount(from);

	const tx = buildSignRequest({
		call,
		nonce,
		chainId,
		gas,
		maxFeePerGas,
		maxPriorityFeePerGas
	});
	progress?.(ProgressStepsSendEnum.SIGN_TRANSFER);

	const raw = await signWithIdentity({ identity, transaction: tx });
	const result = await sendRaw({ networkId, raw });

	progress?.(ProgressStepsSendEnum.TRANSFER);

	return result;
};
