import type {
	AddUserCredentialError,
	BitcoinNetwork,
	CredentialSpec,
	GetUserProfileError,
	UserProfile,
	Utxo
} from '$declarations/backend/backend.did';
import type {
	BtcTxOutput,
	BitcoinNetwork as SignerBitcoinNetwork,
	Utxo as SignerUtxo
} from '$declarations/signer/signer.did';
import type { BtcAddress } from '$lib/types/address';
import { Principal } from '@dfinity/principal';

export interface AddUserCredentialParams {
	credentialJwt: string;
	issuerCanisterId: Principal;
	currentUserVersion?: bigint;
	credentialSpec: CredentialSpec;
}
export type AddUserCredentialResponse = { Ok: null } | { Err: AddUserCredentialError };

export type GetUserProfileResponse = { Ok: UserProfile } | { Err: GetUserProfileError };

export interface BtcSelectUserUtxosFeeParams {
	network: BitcoinNetwork;
	amountSatoshis: bigint;
	minConfirmations: [number];
}

export interface BtcGetPendingTransactionParams {
	network: BitcoinNetwork;
	address: BtcAddress;
}

export interface BtcAddPendingTransactionParams extends BtcGetPendingTransactionParams {
	txId: Uint8Array | number[];
	utxos: Utxo[];
}

export interface SendBtcParams {
	feeSatoshis: [] | [bigint];
	network: SignerBitcoinNetwork;
	utxosToSpend: SignerUtxo[];
	outputs: BtcTxOutput[];
}

export interface AddUserHiddenDappIdParams {
	dappId: string;
	currentUserVersion?: bigint;
}
