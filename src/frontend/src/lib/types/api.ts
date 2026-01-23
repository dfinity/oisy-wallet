import type { BtcAddress } from '$btc/types/address';
import type {
	AllowSigningRequest,
	BitcoinNetwork,
	Contact,
	CredentialSpec,
	GetUserProfileError,
	UserProfile,
	Utxo
} from '$declarations/backend/backend.did';
import type { TxId } from '$declarations/kong_backend/kong_backend.did';
import type {
	BtcTxOutput,
	EcdsaKeyId,
	SchnorrKeyId,
	BitcoinNetwork as SignerBitcoinNetwork,
	Utxo as SignerUtxo
} from '$declarations/signer/signer.did';
import type { IcToken } from '$icp/types/ic-token';
import type { Address } from '$lib/types/address';
import type { Token } from '$lib/types/token';
import type { UserAgreements } from '$lib/types/user-agreements';
import type { UserExperimentalFeatures } from '$lib/types/user-experimental-features';
import type { UserNetworks } from '$lib/types/user-networks';
import type { Identity } from '@icp-sdk/core/agent';
import type { Principal } from '@icp-sdk/core/principal';

export interface AddUserCredentialParams {
	credentialJwt: string;
	issuerCanisterId: Principal;
	currentUserVersion?: bigint;
	credentialSpec: CredentialSpec;
}

export type GetUserProfileResponse = { Ok: UserProfile } | { Err: GetUserProfileError };

export interface AllowSigningParams {
	request?: AllowSigningRequest;
}

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
	txId: Uint8Array;
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
	message: Uint8Array;
}

export interface GenericEcdsaPublicKeyParams {
	derivationPath: string[];
	keyId: EcdsaKeyId;
}

export interface GenericSignWithEcdsaParams extends GenericEcdsaPublicKeyParams {
	messageHash: Uint8Array;
}

export interface AddUserHiddenDappIdParams {
	dappId: string;
	currentUserVersion?: bigint;
}

export interface SaveUserNetworksSettings {
	networks: UserNetworks;
	currentUserVersion?: bigint;
}

export interface SaveUserAgreements {
	agreements: Partial<UserAgreements>;
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

export interface ICPSwapGetPoolParams {
	token0: {
		address: string;
		standard: string;
	};
	token1: {
		address: string;
		standard: string;
	};
	fee: bigint;
}

export interface ICPSwapQuoteSwapParams {
	amountIn: string;
	zeroForOne: boolean;
	amountOutMinimum: string;
}

export interface ICPSwapDepositWithdrawParams {
	token: string;
	amount: bigint;
	fee: bigint;
}

export interface ICPSwapGetUserUnusedBalanceParams {
	principal: Principal;
}

export interface ICPSwapQuoteParams {
	identity: Identity;
	sourceToken: IcToken;
	destinationToken: IcToken;
	sourceAmount: bigint;
	fee?: bigint;
}

export interface ICPSwapAmountReply {
	receiveAmount: bigint;
}

export interface BtcGetFeePercentilesParams {
	network: BitcoinNetwork;
}

export interface GetContactParams {
	identity: Identity;
	contactId: bigint;
}

export interface CreateContactParams {
	identity: Identity;
	name: string;
}

export interface CreateContactParams {
	identity: Identity;
	name: string;
}

export interface UpdateContactParams {
	identity: Identity;
	contact: Contact;
}

export interface DeleteContactParams {
	identity: Identity;
	contactId: bigint;
}

export interface UpdateUserExperimentalFeatureSettings {
	experimentalFeatures: UserExperimentalFeatures;
	currentUserVersion?: bigint;
}
