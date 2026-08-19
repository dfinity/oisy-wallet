import type {
	ActiveUserTransactionData,
	ActiveUserTransactionRef,
	ActiveUserTransactionStatus,
	AllowSigningResponse,
	TokenId as BackendTokenId,
	Network as BitcoinNetwork,
	Contact,
	CreateUserProfileError,
	DismissedNotification,
	GetUserProfileError,
	IIDelegationChain,
	PendingTransaction,
	UserProfile,
	UserTransaction,
	Utxo
} from '$declarations/backend/backend.did';
import type { TxId } from '$declarations/kong_backend/kong_backend.did';
import type {
	BtcTxOutput,
	EcdsaKeyId,
	SchnorrKeyId,
	Network as SignerBitcoinNetwork,
	Utxo as SignerUtxo
} from '$declarations/signer/signer.did';
import type { IcToken } from '$icp/types/ic-token';
import type { Address } from '$lib/types/address';
import type { OnramperCryptoWallet, OnramperId, OnramperNetworkWallet } from '$lib/types/onramper';
import type { Token } from '$lib/types/token';
import type { UserAgreements } from '$lib/types/user-agreements';
import type { UserExperimentalFeatures } from '$lib/types/user-experimental-features';
import type { UserNetworks } from '$lib/types/user-networks';
import type { UserProviderAgreements } from '$lib/types/user-provider-agreements';
import type { Nullable } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';
import type { Principal } from '@icp-sdk/core/principal';

export type GetUserProfileResponse = { Ok: UserProfile } | { Err: GetUserProfileError };

export type CreateUserProfileResponse = { Ok: UserProfile } | { Err: CreateUserProfileError };

export interface RateLimitInfo {
	endpoint: string;
	limiter: string;
}

export interface AddPendingTransactionOutcome {
	response: true;
	rateLimitInfo?: RateLimitInfo;
}

export interface GetPendingTransactionsOutcome {
	response: PendingTransaction[];
	rateLimitInfo?: RateLimitInfo;
}

export interface AllowSigningParams {
	iiDelegationChain: Nullable<IIDelegationChain>;
}

export interface OnramperWalletAddressTagEntry {
	cryptoId: OnramperId;
	tag: string;
}

export interface SignOnramperWidgetUrlParams {
	wallets: OnramperCryptoWallet[];
	networkWallets: OnramperNetworkWallet[];
	walletAddressTags?: OnramperWalletAddressTagEntry[];
}

export interface AllowSigningOutcome {
	response: AllowSigningResponse;
	rateLimitInfo?: RateLimitInfo;
}

export interface BtcGetPendingTransactionParams {
	network: BitcoinNetwork;
	iiDelegationChain: Nullable<IIDelegationChain>;
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

export interface GenericSignWithEcdsaParams {
	derivationPath: string[];
	keyId: EcdsaKeyId;
	messageHash: Uint8Array;
}

export interface AddUserHiddenDappIdParams {
	dappId: string;
	currentUserVersion?: bigint;
}

export interface AddUserDismissedNotificationParams {
	notifications: DismissedNotification[];
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

export interface SaveProviderAgreements {
	providerAgreements: UserProviderAgreements;
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

export interface UpdateUserTransactionFilterSettings {
	hideMicroTransactions: boolean;
	currentUserVersion?: bigint;
}

export interface GetUserTransactionsParams {
	tokenId: BackendTokenId;
	start?: bigint;
	maxResults: bigint;
}

export interface GetUserTransactionsResponse {
	transactions: UserTransaction[];
	newestBlockIndex?: bigint;
	oldestBlockIndex?: bigint;
	totalStored: bigint;
	nextStart?: bigint;
}

export interface SaveUserTransactionsParams {
	tokenId: BackendTokenId;
	transactions: UserTransaction[];
}

export interface CreateActiveUserTransactionParams {
	id: string;
	data: ActiveUserTransactionData;
	progressStep?: string;
	externalRefs: ActiveUserTransactionRef[];
}

export interface UpdateActiveUserTransactionParams {
	id: string;
	status?: ActiveUserTransactionStatus;
	progressStep?: string;
	externalRefs?: ActiveUserTransactionRef[];
	error?: string;
}
