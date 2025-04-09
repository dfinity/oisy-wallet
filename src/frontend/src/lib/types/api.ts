import type {
	AddUserCredentialError,
	AllowSigningRequest,
	BitcoinNetwork,
	CredentialSpec,
	GetUserProfileError,
	UserProfile,
	Utxo
} from '$declarations/backend/backend.did';
import type { TxId } from '$declarations/kong_backend/kong_backend.did';
import type {
	BtcTxOutput,
	SchnorrKeyId,
	BitcoinNetwork as SignerBitcoinNetwork,
	Utxo as SignerUtxo
} from '$declarations/signer/signer.did';
import type { Address, BtcAddress } from '$lib/types/address';
import type { Token } from '$lib/types/token';
import type { UserNetworks } from '$lib/types/user-networks';
import type { Principal } from '@dfinity/principal';

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

export interface GetSchnorrPublicKeyParams {
	derivationPath: string[];
	keyId: SchnorrKeyId;
}

export interface SignWithSchnorrParams extends GetSchnorrPublicKeyParams {
	message: number[];
}

export interface AddUserHiddenDappIdParams {
	dappId: string;
	currentUserVersion?: bigint;
}

export interface SaveUserNetworksSettings {
	networks: UserNetworks;
	currentUserVersion?: bigint;
}

export interface SetUserShowTestnetsParams {
	showTestnets: boolean;
	currentUserVersion?: bigint;
}

export interface KongSwapAmountsParams {
	sourceToken: Token;
	destinationToken: Token;
	sourceAmount: bigint;
}

export interface KongSwapParams {
	destinationToken: Token;
	maxSlippage: number;
	sendAmount: bigint;
	referredBy?: string;
	receiveAmount: bigint;
	receiveAddress?: Address;
	sourceToken: Token;
	payTransactionId?: TxId;
}

export interface AllowSigningParams {
	request?: AllowSigningRequest;
}
