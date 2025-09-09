import type { EthSignTransactionRequest } from '$declarations/signer/signer.did';
import { ERC1155_ABI } from '$eth/constants/erc1155.constants';
import { ERC721_ABI } from '$eth/constants/erc721.constants';
import { infuraProviders } from '$eth/providers/infura.providers';
import type { EthereumNetwork } from '$eth/types/network';
import { signTransaction } from '$lib/api/signer.api';
import { ZERO } from '$lib/constants/app.constants';
import type { EthAddress } from '$lib/types/address';
import type { OptionIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import type { Identity } from '@dfinity/agent';
import { Interface, Transaction } from 'ethers';
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
	tokenId: number;
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
}): EthSignTransactionRequest => {
	console.log(
		'SIGN',
		'gas: ' + gas,
		'maxFeePerGas: ' + maxFeePerGas,
		'maxPriorityFeePerGas: ' + maxPriorityFeePerGas,
		'gas * maxFeePerGas: ' + gas * maxFeePerGas
	);

	return {
		to,
		chain_id: chainId,
		nonce: BigInt(nonce),
		gas: gas,
		max_fee_per_gas: maxFeePerGas,
		max_priority_fee_per_gas: maxPriorityFeePerGas,
		value,
		data: [data]
	};
};

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
	console.log('TRANSFER TOKENID', tokenId);
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

	const signedTx = Transaction.from(raw);
	console.log('SIGNED', {
		chainId: signedTx.chainId, // should be 8453
		gasLimit: signedTx.gasLimit.toString(), // should be 70492
		maxFeePerGas: signedTx.maxFeePerGas?.toString(), // should be 20128422
		maxPriorityFeePerGas: signedTx.maxPriorityFeePerGas?.toString(),
		gasPrice: signedTx.gasPrice?.toString(), // should be undefined on type-2
		to: signedTx.to,
		value: signedTx.value.toString()
	});
	const cap = signedTx.maxFeePerGas ?? signedTx.gasPrice!;
	console.log(
		'capCostWei =',
		(signedTx.gasLimit * cap).toString(),
		'networkId: ' + networkId.toString()
	);
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
	const signedTx = Transaction.from(raw);
	console.log('SIGNED', {
		chainId: signedTx.chainId, // should be 8453
		gasLimit: signedTx.gasLimit.toString(), // should be 70492
		maxFeePerGas: signedTx.maxFeePerGas?.toString(), // should be 20128422
		maxPriorityFeePerGas: signedTx.maxPriorityFeePerGas?.toString(),
		gasPrice: signedTx.gasPrice?.toString(), // should be undefined on type-2
		to: signedTx.to,
		value: signedTx.value.toString()
	});
	const cap = signedTx.maxFeePerGas ?? signedTx.gasPrice!;
	console.log(
		'capCostWei =',
		(signedTx.gasLimit * cap).toString(),
		'networkId: ' + networkId.toString()
	);
	return await sendRaw({ networkId, raw });
};
