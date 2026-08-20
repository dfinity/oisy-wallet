import type { TypedDataDomain, TypedDataField } from 'ethers/hash';

export type WalletConnectEthApproveRequestMessage = string;

export interface WalletConnectEthSendTransactionParams {
	from: string;
	to?: string;
	data?: string;
	gasPrice?: string;
	// The gas limit as `eth_sendTransaction` names it. It is the field OISY signs when present.
	gas?: string;
	gasLimit?: string;
	value?: string;
	nonce?: string;
}

export interface WalletConnectEthSignTypedDataV4 {
	domain: TypedDataDomain;
	types: Record<string, Array<TypedDataField>>;
	message: Record<string, unknown>;
	primaryType: string;
}

/**
 * The approval facts summarized above the raw message of an `eth_signTypedData_v4`
 * request. Every field is read from a member declared by the signed struct, or from the domain
 * that separates it, so what the user reads is what the digest covers.
 */
export interface WalletConnectEthTypedDataApproval {
	spender?: string;
	token?: string;
	amount?: bigint;
	// `true` when the allowance is the largest its schema can express, which is how an unlimited
	// approval is written. Carried as a fact rather than left to the view to work out, because
	// each schema says it differently: a saturated `uint160` for Permit2, a saturated `uint256`
	// for ERC-2612, and a bare `allowed` bool for DAI.
	unlimited?: boolean;
	expiration?: number;
}
