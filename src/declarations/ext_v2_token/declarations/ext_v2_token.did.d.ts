import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';
import type { Principal } from '@dfinity/principal';

export type AccountIdentifier = string;
export type AccountIdentifier__1 = string;
export type AssetHandle = string;
export type AssetId = number;
export type AssetType =
	| { other: string }
	| { canister: { id: AssetId; canister: string } }
	| { direct: Uint32Array | number[] };
export type Balance = bigint;
export interface BalanceRequest {
	token: TokenIdentifier;
	user: User;
}
export type BalanceResponse = { ok: Balance } | { err: CommonError__1 };
export type Balance__1 = bigint;
export type ChunkId = number;
export type CommonError = { InvalidToken: TokenIdentifier } | { Other: string };
export type CommonError__1 = { InvalidToken: TokenIdentifier } | { Other: string };
export interface EXTNFT {
	acceptCycles: ActorMethod<[], undefined>;
	addAsset: ActorMethod<[AssetHandle, number, string, string, string], undefined>;
	addThumbnail: ActorMethod<[AssetHandle, Uint8Array | number[]], undefined>;
	adminKillHeartbeat: ActorMethod<[], undefined>;
	adminStartHeartbeat: ActorMethod<[], undefined>;
	allSettlements: ActorMethod<
		[],
		Array<
			[
				TokenIndex,
				{
					subaccount: SubAccount__1;
					seller: Principal;
					buyer: AccountIdentifier__1;
					price: bigint;
				}
			]
		>
	>;
	availableCycles: ActorMethod<[], bigint>;
	balance: ActorMethod<[BalanceRequest], BalanceResponse>;
	bearer: ActorMethod<[TokenIdentifier__1], Result_7>;
	details: ActorMethod<[TokenIdentifier__1], Result_10>;
	ext_addAssetCanister: ActorMethod<[], undefined>;
	ext_admin: ActorMethod<[], Principal>;
	ext_assetAdd: ActorMethod<[AssetHandle, string, string, AssetType, bigint], undefined>;
	ext_assetExists: ActorMethod<[AssetHandle], boolean>;
	ext_assetFits: ActorMethod<[boolean, bigint], boolean>;
	ext_assetStream: ActorMethod<[AssetHandle, Uint8Array | number[], boolean], boolean>;
	ext_balance: ActorMethod<[BalanceRequest], BalanceResponse>;
	ext_bearer: ActorMethod<[TokenIdentifier__1], Result_7>;
	ext_capInit: ActorMethod<[], undefined>;
	ext_expired: ActorMethod<[], Array<[AccountIdentifier__1, SubAccount__1]>>;
	ext_extensions: ActorMethod<[], Array<Extension>>;
	ext_marketplaceList: ActorMethod<[ListRequest], Result_3>;
	ext_marketplaceListings: ActorMethod<[], Array<[TokenIndex, Listing, Metadata]>>;
	ext_marketplacePurchase: ActorMethod<
		[TokenIdentifier__1, bigint, AccountIdentifier__1],
		Result_9
	>;
	ext_marketplaceSettle: ActorMethod<[AccountIdentifier__1], Result_3>;
	ext_marketplaceStats: ActorMethod<[], [bigint, bigint, bigint, bigint, bigint, bigint, bigint]>;
	ext_marketplaceTransactions: ActorMethod<[], Array<Transaction>>;
	ext_metadata: ActorMethod<[TokenIdentifier__1], Result_8>;
	ext_mint: ActorMethod<[Array<[AccountIdentifier__1, Metadata]>], Uint32Array | number[]>;
	ext_payments: ActorMethod<[], Array<[AccountIdentifier__1, Payment]>>;
	ext_removeAdmin: ActorMethod<[], undefined>;
	ext_saleClose: ActorMethod<[], boolean>;
	ext_saleCurrent: ActorMethod<[], [] | [Sale]>;
	ext_saleEnd: ActorMethod<[], boolean>;
	ext_saleOpen: ActorMethod<
		[Array<SalePricingGroup>, SaleRemaining, Array<AccountIdentifier__1>],
		boolean
	>;
	ext_salePause: ActorMethod<[], boolean>;
	ext_salePurchase: ActorMethod<[bigint, bigint, bigint, AccountIdentifier__1], Result_5>;
	ext_saleResume: ActorMethod<[], boolean>;
	ext_saleSettings: ActorMethod<[AccountIdentifier__1], [] | [SaleDetails]>;
	ext_saleSettle: ActorMethod<[AccountIdentifier__1], Result_4>;
	ext_saleTransactions: ActorMethod<[], Array<SaleTransaction>>;
	ext_saleUpdate: ActorMethod<
		[[] | [Array<SalePricingGroup>], [] | [SaleRemaining], [] | [Array<AccountIdentifier__1>]],
		boolean
	>;
	ext_setAdmin: ActorMethod<[Principal], undefined>;
	ext_setCollectionMetadata: ActorMethod<[string, string], undefined>;
	ext_setMarketplaceOpen: ActorMethod<[Time], undefined>;
	ext_setOwner: ActorMethod<[Principal], undefined>;
	ext_setRoyalty: ActorMethod<[Array<[AccountIdentifier__1, bigint]>], undefined>;
	ext_setSaleRoyalty: ActorMethod<[AccountIdentifier__1], undefined>;
	ext_transfer: ActorMethod<[TransferRequest], TransferResponse>;
	extdata_supply: ActorMethod<[TokenIdentifier__1], Result_2>;
	extensions: ActorMethod<[], Array<Extension>>;
	failedSales: ActorMethod<[], Array<[AccountIdentifier__1, SubAccount__1]>>;
	getMetadata: ActorMethod<[], Array<[TokenIndex, MetadataLegacy]>>;
	getMinter: ActorMethod<[], Principal>;
	getRegistry: ActorMethod<[], Array<[TokenIndex, AccountIdentifier__1]>>;
	getTokens: ActorMethod<[], Array<[TokenIndex, MetadataLegacy]>>;
	heartbeat_assetCanisters: ActorMethod<[], undefined>;
	heartbeat_capEvents: ActorMethod<[], undefined>;
	heartbeat_disbursements: ActorMethod<[], undefined>;
	heartbeat_external: ActorMethod<[], undefined>;
	heartbeat_isRunning: ActorMethod<[], boolean>;
	heartbeat_paymentSettlements: ActorMethod<[], undefined>;
	heartbeat_pending: ActorMethod<[], Array<[string, bigint]>>;
	heartbeat_start: ActorMethod<[], undefined>;
	heartbeat_stop: ActorMethod<[], undefined>;
	http_request: ActorMethod<[HttpRequest], HttpResponse>;
	http_request_streaming_callback: ActorMethod<
		[HttpStreamingCallbackToken],
		HttpStreamingCallbackResponse
	>;
	http_request_update: ActorMethod<[HttpRequest], HttpResponse>;
	isHeartbeatRunning: ActorMethod<[], boolean>;
	list: ActorMethod<[ListRequest], Result_3>;
	listings: ActorMethod<[], Array<[TokenIndex, Listing, MetadataLegacy]>>;
	lock: ActorMethod<[TokenIdentifier__1, bigint, AccountIdentifier__1, SubAccount__1], Result_7>;
	metadata: ActorMethod<[TokenIdentifier__1], Result_6>;
	reserve: ActorMethod<[bigint, bigint, AccountIdentifier__1, SubAccount__1], Result_5>;
	retreive: ActorMethod<[AccountIdentifier__1], Result_4>;
	saleTransactions: ActorMethod<[], Array<SaleTransaction>>;
	salesSettings: ActorMethod<[AccountIdentifier__1], SaleSettings>;
	setMinter: ActorMethod<[Principal], undefined>;
	settle: ActorMethod<[TokenIdentifier__1], Result_3>;
	settlements: ActorMethod<[], Array<[TokenIndex, AccountIdentifier__1, bigint]>>;
	stats: ActorMethod<[], [bigint, bigint, bigint, bigint, bigint, bigint, bigint]>;
	supply: ActorMethod<[TokenIdentifier__1], Result_2>;
	tokens: ActorMethod<[AccountIdentifier__1], Result_1>;
	tokens_ext: ActorMethod<[AccountIdentifier__1], Result>;
	transactions: ActorMethod<[], Array<Transaction>>;
	transfer: ActorMethod<[TransferRequest], TransferResponse>;
}
export type Extension = string;
export type HeaderField = [string, string];
export interface HttpRequest {
	url: string;
	method: string;
	body: Uint8Array | number[];
	headers: Array<HeaderField>;
}
export interface HttpResponse {
	body: Uint8Array | number[];
	headers: Array<HeaderField>;
	upgrade: boolean;
	streaming_strategy: [] | [HttpStreamingStrategy];
	status_code: number;
}
export interface HttpStreamingCallbackResponse {
	token: [] | [HttpStreamingCallbackToken];
	body: Uint8Array | number[];
}
export interface HttpStreamingCallbackToken {
	key: string;
	sha256: [] | [Uint8Array | number[]];
	index: bigint;
	content_encoding: string;
}
export type HttpStreamingStrategy = {
	Callback: {
		token: HttpStreamingCallbackToken;
		callback: [Principal, string];
	};
};
export interface ListRequest {
	token: TokenIdentifier__1;
	from_subaccount: [] | [SubAccount__1];
	price: [] | [bigint];
}
export interface Listing {
	locked: [] | [Time];
	seller: Principal;
	price: bigint;
}
export type Memo = Uint8Array | number[];
export type Metadata =
	| {
			fungible: {
				decimals: number;
				metadata: [] | [MetadataContainer];
				name: string;
				symbol: string;
			};
	  }
	| {
			nonfungible: {
				thumbnail: string;
				asset: string;
				metadata: [] | [MetadataContainer];
				name: string;
			};
	  };
export type MetadataContainer =
	| { blob: Uint8Array | number[] }
	| { data: Array<MetadataValue> }
	| { json: string };
export type MetadataLegacy =
	| {
			fungible: {
				decimals: number;
				metadata: [] | [Uint8Array | number[]];
				name: string;
				symbol: string;
			};
	  }
	| { nonfungible: { metadata: [] | [Uint8Array | number[]] } };
export type MetadataValue = [
	string,
	{ nat: bigint } | { blob: Uint8Array | number[] } | { nat8: number } | { text: string }
];
export interface Payment {
	expires: Time;
	subaccount: SubAccount__1;
	payer: AccountIdentifier__1;
	amount: bigint;
	purchase: PaymentType;
}
export type PaymentType = { nft: TokenIndex } | { nfts: Uint32Array | number[] } | { sale: bigint };
export type Result =
	| {
			ok: Array<[TokenIndex, [] | [Listing], [] | [Uint8Array | number[]]]>;
	  }
	| { err: CommonError };
export type Result_1 = { ok: Uint32Array | number[] } | { err: CommonError };
export type Result_10 = { ok: [AccountIdentifier__1, [] | [Listing]] } | { err: CommonError };
export type Result_2 = { ok: Balance__1 } | { err: CommonError };
export type Result_3 = { ok: null } | { err: CommonError };
export type Result_4 = { ok: null } | { err: string };
export type Result_5 = { ok: [AccountIdentifier__1, bigint] } | { err: string };
export type Result_6 = { ok: MetadataLegacy } | { err: CommonError };
export type Result_7 = { ok: AccountIdentifier__1 } | { err: CommonError };
export type Result_8 = { ok: Metadata } | { err: CommonError };
export type Result_9 = { ok: [AccountIdentifier__1, bigint] } | { err: CommonError };
export interface Sale {
	end: Time;
	groups: Array<SalePricingGroup>;
	start: Time;
	quantity: bigint;
	remaining: SaleRemaining;
}
export interface SaleDetailGroup {
	id: bigint;
	end: Time;
	name: string;
	available: boolean;
	pricing: Array<[bigint, bigint]>;
	start: Time;
}
export interface SaleDetails {
	end: Time;
	groups: Array<SaleDetailGroup>;
	start: Time;
	quantity: bigint;
	remaining: bigint;
}
export interface SalePricingGroup {
	end: Time;
	participants: Array<AccountIdentifier__1>;
	name: string;
	limit: [bigint, bigint];
	pricing: Array<[bigint, bigint]>;
	start: Time;
}
export type SaleRemaining = { retain: null } | { burn: null } | { send: AccountIdentifier__1 };
export interface SaleSettings {
	startTime: Time;
	whitelist: boolean;
	totalToSell: bigint;
	sold: bigint;
	bulkPricing: Array<[bigint, bigint]>;
	whitelistTime: Time;
	salePrice: bigint;
	remaining: bigint;
	price: bigint;
}
export interface SaleTransaction {
	time: Time;
	seller: Principal;
	tokens: Uint32Array | number[];
	buyer: AccountIdentifier__1;
	price: bigint;
}
export type SubAccount = Uint8Array | number[];
export type SubAccount__1 = Uint8Array | number[];
export type Time = bigint;
export type TokenIdentifier = string;
export type TokenIdentifier__1 = string;
export type TokenIndex = number;
export interface Transaction {
	token: TokenIndex;
	time: Time;
	seller: AccountIdentifier__1;
	buyer: AccountIdentifier__1;
	price: bigint;
}
export interface TransferRequest {
	to: User;
	token: TokenIdentifier;
	notify: boolean;
	from: User;
	memo: Memo;
	subaccount: [] | [SubAccount];
	amount: Balance;
}
export type TransferResponse =
	| { ok: Balance }
	| {
			err:
				| { CannotNotify: AccountIdentifier }
				| { InsufficientBalance: null }
				| { InvalidToken: TokenIdentifier }
				| { Rejected: null }
				| { Unauthorized: AccountIdentifier }
				| { Other: string };
	  };
export type User = { principal: Principal } | { address: AccountIdentifier };
export interface _SERVICE extends EXTNFT {}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
