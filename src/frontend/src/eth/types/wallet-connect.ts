import type { TypedDataDomain, TypedDataField } from 'ethers/hash';

export type WalletConnectEthApproveRequestMessage = string;

export interface WalletConnectEthSendTransactionParams {
	from: string;
	to?: string;
	data?: string;
	gasPrice?: string;
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
