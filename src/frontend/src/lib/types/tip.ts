import type { ClaimableDealView, DealView } from '$declarations/escrow/escrow.did';
import type { OptionIdentity } from '$lib/types/identity';
import type { Token } from '$lib/types/token';

export interface TipCreateParams {
	amount: bigint;
	token: Token;
	title?: string;
	note?: string;
	expiresAtNs: bigint;
}

export interface TipShareData {
	dealId: bigint;
	claimCode: string;
	amount: bigint;
	tokenLedgerCanisterId: string;
	title?: string;
	note?: string;
}

export interface TipClaimParams {
	dealId: bigint;
	claimCode: string;
}

export interface TipCreateServiceParams extends TipCreateParams {
	identity: OptionIdentity;
}

export interface TipClaimServiceParams extends TipClaimParams {
	identity: OptionIdentity;
}

export interface TipPreviewServiceParams {
	identity: OptionIdentity;
	dealId: bigint;
}

export type TipCreateResult =
	| { success: true; shareData: TipShareData; deal: DealView }
	| { success: false; error: string };

export type TipClaimResult = { success: true; deal: DealView } | { success: false; error: string };

export type TipPreviewResult =
	| { success: true; deal: ClaimableDealView }
	| { success: false; error: string };
