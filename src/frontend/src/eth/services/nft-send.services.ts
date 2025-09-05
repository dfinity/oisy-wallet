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
import { encodePrincipalToEthAddress } from '@dfinity/cketh';
import { assertNonNullish } from '@dfinity/utils';
import { Interface } from 'ethers';
import type { TransactionResponse } from 'ethers/providers';

export interface CommonNftTransferParams {
	sourceNetwork: EthereumNetwork; // must include { id: NetworkId; chainId: number }
	identity: Identity; // your IC identity (passkey)
	from?: EthAddress; // optional; derived from identity if absent
	gas?: bigint;
	maxFeePerGas?: bigint;
	maxPriorityFeePerGas?: bigint;
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
	data?: `0x${string}` | string; // defaults to "0x"
}

interface PrepareErc721Params extends TransferErc721Params {}
interface PrepareErc1155Params extends TransferErc1155Params {}

interface BuildSignRequestParams {
	to: EthAddress;
	value: bigint;
	data: `0x${string}` | string;
	nonce: number;
	gas?: bigint;
	chainId: bigint;
	maxFeePerGas?: bigint;
	maxPriorityFeePerGas?: bigint;
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
	tokenId,
	contractAddress
}: TransferErc721Params): Promise<TransactionResponse> => {
	const txReq = await prepareErc721Transfer({
		identity,
		sourceNetwork,
		to,
		tokenId,
		contractAddress
	});
	const raw = await signWithIdentity({ identity, transaction: txReq });
	return await sendRaw({ networkId: sourceNetwork.id, raw });
};

export const transferErc1155 = async ({
	identity,
	sourceNetwork,
	to,
	id,
	amount,
	contractAddress
}: TransferErc1155Params): Promise<TransactionResponse> => {
	const txReq = await prepareErc1155Transfer({
		identity,
		sourceNetwork,
		to,
		id,
		amount,
		contractAddress
	});
	const raw = await signWithIdentity({ identity, transaction: txReq });
	return await sendRaw({ networkId: sourceNetwork.id, raw });
};

const prepareErc721Transfer = async (
	params: PrepareErc721Params
): Promise<EthSignTransactionRequest> => {
	const {
		contractAddress,
		tokenId,
		to,
		sourceNetwork,
		identity,
		gas,
		maxFeePerGas,
		maxPriorityFeePerGas
	} = params;

	const fromAddr = encodePrincipalToEthAddress(identity.getPrincipal());
	const nonce = await infuraProviders(sourceNetwork.id).getTransactionCount(fromAddr);

	const data = new Interface(ERC721_ABI).encodeFunctionData('safeTransferFrom', [
		fromAddr,
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

const prepareErc1155Transfer = async (
	params: PrepareErc1155Params
): Promise<EthSignTransactionRequest> => {
	const {
		contractAddress,
		id,
		amount,
		to,
		data = '0x',
		sourceNetwork,
		identity,
		gas,
		maxFeePerGas,
		maxPriorityFeePerGas
	} = params;

	const fromAddr = encodePrincipalToEthAddress(identity.getPrincipal());
	const nonce = await infuraProviders(sourceNetwork.id).getTransactionCount(fromAddr);

	const encoded = new Interface(ERC1155_ABI).encodeFunctionData('safeTransferFrom', [
		fromAddr,
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

const buildSignRequest = (params: BuildSignRequestParams): EthSignTransactionRequest => ({
	to: params.to,
	chain_id: params.chainId,
	nonce: BigInt(params.nonce),
	gas: params.gas ?? ETH_BASE_FEE,
	max_fee_per_gas: params.maxFeePerGas ?? ETH_BASE_FEE,
	max_priority_fee_per_gas: params.maxPriorityFeePerGas ?? ETH_BASE_FEE,
	value: params.value,
	data: [params.data]
});

const signWithIdentity = async (params: SignWithIdentityParams): Promise<string> => {
	assertNonNullish(params.identity, 'No Internet Identity to sign NFT transfer');
	return await signTransaction({ identity: params.identity, transaction: params.transaction });
};

const sendRaw = async (params: SendRawParams): Promise<TransactionResponse> => {
	return await infuraProviders(params.networkId).sendTransaction(params.raw);
};
