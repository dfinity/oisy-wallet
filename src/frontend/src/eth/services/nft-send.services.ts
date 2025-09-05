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
	tokenId: bigint | number | string;
	to: EthAddress;
}

export interface TransferErc1155Params extends CommonNftTransferParams {
	contractAddress: string;
	id: bigint | number | string;
	amount: bigint | number | string;
	to: EthAddress;
	data?: `0x${string}` | string;
}

interface PrepareErc721Params extends TransferErc721Params {}
interface PrepareErc1155Params extends TransferErc1155Params {}

interface BuildSignRequestParams {
	to: EthAddress;
	value: bigint;
	data: `0x${string}` | string;
	nonce: number;
	gas: bigint;
	chainId: bigint;
	maxFeePerGas: bigint;
	maxPriorityFeePerGas: bigint;
}

interface SignWithIdentityParams {
	identity: OptionIdentity;
	transaction: EthSignTransactionRequest;
}

interface SendRawParams {
	networkId: NetworkId;
	raw: string;
}

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
	const txReq = await prepareErc721Transfer({
		identity,
		sourceNetwork,
		to,
		from,
		tokenId,
		contractAddress,
		gas,
		maxFeePerGas,
		maxPriorityFeePerGas
	});
	const raw = await signWithIdentity({ identity, transaction: txReq });
	return await sendRaw({ networkId: sourceNetwork.id, raw });
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
	maxPriorityFeePerGas
}: TransferErc1155Params): Promise<TransactionResponse> => {
	const txReq = await prepareErc1155Transfer({
		identity,
		sourceNetwork,
		to,
		from,
		id,
		amount,
		contractAddress,
		gas,
		maxFeePerGas,
		maxPriorityFeePerGas
	});
	const raw = await signWithIdentity({ identity, transaction: txReq });
	return await sendRaw({ networkId: sourceNetwork.id, raw });
};

const prepareErc721Transfer = async ({
	contractAddress,
	tokenId,
	to,
	from,
	sourceNetwork,
	gas,
	maxFeePerGas,
	maxPriorityFeePerGas
}: PrepareErc721Params): Promise<EthSignTransactionRequest> => {
	const nonce = await infuraProviders(sourceNetwork.id).getTransactionCount(from);

	const data = new Interface(ERC721_ABI).encodeFunctionData('safeTransferFrom', [
		from,
		to,
		BigInt(tokenId)
	]);

	return buildSignRequest({
		to: contractAddress as EthAddress,
		value: ZERO,
		data,
		nonce,
		gas,
		chainId: sourceNetwork.chainId,
		maxFeePerGas,
		maxPriorityFeePerGas
	});
};

const prepareErc1155Transfer = async ({
	contractAddress,
	id,
	amount,
	to,
	from,
	data = '0x',
	sourceNetwork,
	gas,
	maxFeePerGas,
	maxPriorityFeePerGas
}: PrepareErc1155Params): Promise<EthSignTransactionRequest> => {
	const nonce = await infuraProviders(sourceNetwork.id).getTransactionCount(from);

	const encoded = new Interface(ERC1155_ABI).encodeFunctionData('safeTransferFrom', [
		from,
		to,
		BigInt(id),
		BigInt(amount),
		data
	]);

	return buildSignRequest({
		to: contractAddress as EthAddress,
		value: ZERO,
		data: encoded,
		nonce,
		gas,
		chainId: sourceNetwork.chainId,
		maxFeePerGas,
		maxPriorityFeePerGas
	});
};

const buildSignRequest = ({
	to,
	chainId,
	nonce,
	gas,
	maxFeePerGas,
	maxPriorityFeePerGas,
	value,
	data
}: BuildSignRequestParams): EthSignTransactionRequest => ({
	to: to,
	chain_id: chainId,
	nonce: BigInt(nonce),
	gas: gas ?? ETH_BASE_FEE,
	max_fee_per_gas: maxFeePerGas ?? ETH_BASE_FEE,
	max_priority_fee_per_gas: maxPriorityFeePerGas ?? ETH_BASE_FEE,
	value: value,
	data: [data]
});

const signWithIdentity = async ({
	identity,
	transaction
}: SignWithIdentityParams): Promise<string> => {
	return await signTransaction({ identity, transaction: transaction });
};

const sendRaw = async ({ networkId, raw }: SendRawParams): Promise<TransactionResponse> => {
	return await infuraProviders(networkId).sendTransaction(raw);
};
