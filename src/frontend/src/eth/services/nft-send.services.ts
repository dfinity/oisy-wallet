import type { EthSignTransactionRequest } from '$declarations/signer/signer.did';
import { ERC1155_ABI } from '$eth/constants/erc1155.constants';
import { ERC721_ABI } from '$eth/constants/erc721.constants';
import { ETH_BASE_FEE } from '$eth/constants/eth.constants';
import { infuraProviders } from '$eth/providers/infura.providers';
import type { EthereumNetwork } from '$eth/types/network';
import { signTransaction } from '$lib/api/signer.api';
import { ZERO } from '$lib/constants/app.constants';
import type { EthAddress } from '$lib/types/address';
import type { OptionIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import type { Identity } from '@dfinity/agent';
import { Interface } from 'ethers';
import type { TransactionResponse } from 'ethers/providers';

type Bigish = bigint | number | string;

export interface CommonNftTransferParams {
	sourceNetwork: EthereumNetwork;
	identity: Identity;
	from: EthAddress;
	gas: bigint;
	maxFeePerGas: bigint;
	maxPriorityFeePerGas: bigint;
}

export interface TransferErc721Params extends CommonNftTransferParams {
	contractAddress: string;
	tokenId: Bigish;
	to: EthAddress;
}

export interface TransferErc1155Params extends CommonNftTransferParams {
	contractAddress: string;
	id: Bigish;
	amount: Bigish;
	to: EthAddress;
	data?: `0x${string}` | string;
}

export type PreparedContractCall = {
	to: EthAddress;
	data: `0x${string}` | string;
};

/* ---------------- encoders (shared) ---------------- */

export const encodeErc721SafeTransfer = ({
	contractAddress,
	from,
	to,
	tokenId
}: {
	contractAddress: string;
	from: EthAddress;
	to: EthAddress;
	tokenId: Bigish;
}): PreparedContractCall => {
	const encoded = new Interface(ERC721_ABI).encodeFunctionData('safeTransferFrom', [
		from,
		to,
		BigInt(tokenId)
	]) as `0x${string}`;

	console.log('Prepare snd erc721', encoded);

	return { to: contractAddress as EthAddress, data: encoded };
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
	tokenId: Bigish;
	amount: Bigish;
	data?: `0x${string}` | string;
}): PreparedContractCall => {
	const encoded = new Interface(ERC1155_ABI).encodeFunctionData('safeTransferFrom', [
		from,
		to,
		BigInt(tokenId),
		BigInt(amount),
		data
	]) as `0x${string}`;
	console.log('Prepare snd erc1155', encoded);

	return { to: contractAddress as EthAddress, data: encoded };
};

/* ---------------- sign request builder ---------------- */

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
	gas: gas ?? ETH_BASE_FEE,
	max_fee_per_gas: maxFeePerGas ?? ETH_BASE_FEE,
	max_priority_fee_per_gas: maxPriorityFeePerGas ?? ETH_BASE_FEE,
	value,
	data: [data]
});

/* ---------------- sign+send helpers ---------------- */

const signWithIdentity = async ({
	identity,
	transaction
}: {
	identity: OptionIdentity;
	transaction: EthSignTransactionRequest;
}): Promise<string> => signTransaction({ identity, transaction });

const sendRaw = async ({
	networkId,
	raw
}: {
	networkId: NetworkId;
	raw: string;
}): Promise<TransactionResponse> => infuraProviders(networkId).sendTransaction(raw);

/* ---------------- public API ---------------- */

export const transferErc721 = async ({
	identity,
	sourceNetwork,
	to,
	from,
	tokenId,
	contractAddress,
	gas,
	maxFeePerGas,
	maxPriorityFeePerGas
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

	const raw = await signWithIdentity({ identity, transaction: tx });
	return await sendRaw({ networkId, raw });
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
	data
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

	const raw = await signWithIdentity({ identity, transaction: tx });
	return await sendRaw({ networkId, raw });
};
