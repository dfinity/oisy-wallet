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
import { encodePrincipalToEthAddress } from '@dfinity/cketh';
import { assertNonNullish } from '@dfinity/utils';
import { Interface } from 'ethers';
import type { TransactionResponse } from 'ethers/providers';

export interface CommonNftTransferParams {
	sourceNetwork: EthereumNetwork; // must include { id: NetworkId; chainId: number }
	identity: OptionIdentity; // your IC identity (passkey)
	from?: EthAddress; // optional; derived from identity if absent
	gas?: bigint;
	maxFeePerGas?: bigint;
	maxPriorityFeePerGas?: bigint;
}

export interface TransferErc721ViaIdentityParams extends CommonNftTransferParams {
	contractAddress: string;
	tokenId: bigint | number | string;
	to: EthAddress;
}

export interface TransferErc1155ViaIdentityParams extends CommonNftTransferParams {
	contractAddress: string;
	id: bigint | number | string;
	amount: bigint | number | string;
	to: EthAddress;
	data?: `0x${string}` | string; // defaults to "0x"
}

interface PrepareErc721Params extends TransferErc721ViaIdentityParams {}
interface PrepareErc1155Params extends TransferErc1155ViaIdentityParams {}

interface ResolveFromAddressParams {
	identity: OptionIdentity;
	from?: EthAddress;
}

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

/* --------------------------------- API ----------------------------------- */

export const transferErc721ViaIdentity = async (
	params: TransferErc721ViaIdentityParams
): Promise<TransactionResponse> => {
	const txReq = await prepareErc721Transfer(params);
	const raw = await signWithIdentity({ identity: params.identity, transaction: txReq });
	return await sendRaw({ networkId: params.sourceNetwork.id, raw });
};

export const transferErc1155ViaIdentity = async (
	params: TransferErc1155ViaIdentityParams
): Promise<TransactionResponse> => {
	const txReq = await prepareErc1155Transfer(params);
	const raw = await signWithIdentity({ identity: params.identity, transaction: txReq });
	return await sendRaw({ networkId: params.sourceNetwork.id, raw });
};

/* ------------------------------- Helpers --------------------------------- */

const ERC721_IFACE = new Interface(ERC721_ABI);
const ERC1155_IFACE = new Interface(ERC1155_ABI);

const prepareErc721Transfer = async (
	params: PrepareErc721Params
): Promise<EthSignTransactionRequest> => {
	const {
		contractAddress,
		tokenId,
		to,
		sourceNetwork,
		identity,
		from,
		gas,
		maxFeePerGas,
		maxPriorityFeePerGas
	} = params;

	const fromAddr = await resolveFromAddress({ identity, from });
	const nonce = await infuraProviders(sourceNetwork.id).getTransactionCount(fromAddr);

	const data = ERC721_IFACE.encodeFunctionData('safeTransferFrom', [fromAddr, to, BigInt(tokenId)]);

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
		from,
		gas,
		maxFeePerGas,
		maxPriorityFeePerGas
	} = params;

	const fromAddr = await resolveFromAddress({ identity, from });
	const nonce = await infuraProviders(sourceNetwork.id).getTransactionCount(fromAddr);

	const encoded = ERC1155_IFACE.encodeFunctionData('safeTransferFrom', [
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

const resolveFromAddress = async (params: ResolveFromAddressParams): Promise<EthAddress> => {
	if (params.from) return params.from;
	assertNonNullish(params.identity, 'No Internet Identity available to derive from-address');
	return encodePrincipalToEthAddress(params.identity.getPrincipal());
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
