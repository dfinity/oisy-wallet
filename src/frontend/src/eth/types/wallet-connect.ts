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

/**
 * What an `eth_sendTransaction` request asks OISY to do, as far as OISY can tell from its calldata.
 *
 * The review renders one of these and nothing else, which is what keeps it honest: a request only
 * reaches a variant that names a call once its selector has been recognised, so the default is
 * `unknown` rather than the native summary. A request carrying calldata nobody here decoded used to
 * fall through to `native` and be presented as a zero-value send to the contract address, which is
 * how an `increaseAllowance` granting an attacker an unlimited allowance came to be reviewed as
 * "Send 0 ETH". Any selector OISY does not decode belongs in `unknown`, and adding a variant is
 * therefore a change to what OISY can describe, never to what it will approve.
 */
export type WalletConnectEthCall =
	// No calldata: the transaction moves native value and does nothing else.
	| { type: 'native' }
	| { type: 'erc20Approve' }
	| { type: 'erc20Transfer' }
	| { type: 'setApprovalForAll' }
	// `increaseAllowance` / `decreaseAllowance`: an allowance granted or reduced by a delta rather
	// than set to an absolute amount.
	| { type: 'erc20AllowanceDelta'; increase: boolean }
	// The selector is carried so the review can name the call it could not decode. It is `undefined`
	// when the calldata is too short to hold one.
	| { type: 'unknown'; selector: string | undefined };

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
