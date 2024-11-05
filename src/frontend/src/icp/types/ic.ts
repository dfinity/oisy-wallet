import type {
	IndexCanisterIdText,
	LedgerCanisterIdText,
	MinterCanisterIdText
} from '$icp/types/canister';
import type { CoingeckoCoinsId } from '$lib/types/coingecko';
import type { Token } from '$lib/types/token';
import type { Option } from '$lib/types/utils';

export type IcToken = Token & IcFee & IcInterface;
export type IcTokenWithoutId = Omit<IcToken, 'id'>;

export interface IcFee {
	fee: bigint;
}

export type IcInterface = IcCanisters & IcAppMetadata;
export interface IcCanisters {
	ledgerCanisterId: LedgerCanisterIdText;
	indexCanisterId: IndexCanisterIdText;
}

export type IcCkToken = IcToken & Partial<IcCkMetadata>;

export type IcCkInterface = IcInterface & IcCkMetadata;

export type IcCkMetadata = {
	minterCanisterId: MinterCanisterIdText;
} & Partial<IcCkLinkedAssets>;

export interface IcCkLinkedAssets {
	twinToken: Token;
	feeLedgerCanisterId?: LedgerCanisterIdText;
}

export interface IcAppMetadata {
	exchangeCoinId?: CoingeckoCoinsId;
	position: number;
	explorerUrl?: string;
}

export type OptionIcToken = Option<IcToken>;
export type OptionIcCkToken = Option<IcCkToken>;
