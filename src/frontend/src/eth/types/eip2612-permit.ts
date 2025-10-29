import type { EthAddress } from '$eth/types/address';
import type { Erc20Token } from '$eth/types/erc20';
import type { Identity } from '@dfinity/agent';
import type { Contract } from 'ethers/contract';

export interface PermitParams {
	token: Erc20Token;
	userAddress: EthAddress;
	spender: string;
	value: string;
	identity: Identity;
	deadline?: number;
}

export interface PermitMetadata {
	nonce: string;
	name: string;
	version: string;
	deadline: number;
}

export interface EIP2612Domain {
	name: string;
	version: string;
	chainId: number;
	verifyingContract: string;
}

export interface EIP2612Values {
	owner: string;
	spender: string;
	value: string;
	nonce: string;
	deadline: string;
}

export interface PermitResult {
	nonce: string;
	deadline: number;
	encodedPermit: string;
}

export interface FetchPermitMetadataParams {
	tokenContract: Contract;
	userAddress: EthAddress;
	customDeadline?: number;
	tokenName: string;
}

export interface CreateEIP2612TypedDataParams {
	token: Erc20Token;
	userAddress: EthAddress;
	spender: string;
	value: string;
	metadata: PermitMetadata;
}
