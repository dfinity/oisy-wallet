import { approve } from '$icp/api/icrc-ledger.api';
import {
	acceptDeal as acceptDealApi,
	createDeal as createDealApi,
	fundDeal as fundDealApi,
	getClaimableDeal as getClaimableDealApi
} from '$lib/api/escrow.api';
import { ESCROW_CANISTER_ID, NANO_SECONDS_IN_MINUTE } from '$lib/constants/app.constants';
import type {
	TipClaimResult,
	TipClaimServiceParams,
	TipCreateResult,
	TipCreateServiceParams,
	TipPreviewResult,
	TipPreviewServiceParams,
	TipShareData
} from '$lib/types/tip';
import { assertNonNullish, fromNullable, nowInBigIntNanoSeconds } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';

export const createAndFundTip = async ({
	identity,
	amount,
	token,
	title,
	note,
	expiresAtNs
}: TipCreateServiceParams): Promise<TipCreateResult> => {
	try {
		assertNonNullish(identity, 'Identity is required to create a tip');

		const ledgerCanisterId: string =
			(token as { ledgerCanisterId?: string }).ledgerCanisterId ?? '';
		assertNonNullish(ledgerCanisterId, 'Token must have a ledger canister ID');

		const tokenLedger = Principal.fromText(ledgerCanisterId);

		const deal = await createDealApi({
			identity,
			amount,
			tokenLedger,
			expiresAtNs,
			title,
			note
		});

		const claimCode = fromNullable(deal.claim_code);
		assertNonNullish(claimCode, 'Deal did not return a claim code');

		await approve({
			identity,
			ledgerCanisterId,
			amount,
			spender: { owner: Principal.fromText(ESCROW_CANISTER_ID) },
			expiresAt: nowInBigIntNanoSeconds() + 5n * NANO_SECONDS_IN_MINUTE
		});

		const fundedDeal = await fundDealApi({
			identity,
			dealId: deal.id
		});

		const shareData: TipShareData = {
			dealId: fundedDeal.id,
			claimCode,
			amount: fundedDeal.amount,
			tokenLedgerCanisterId: ledgerCanisterId,
			title: fromNullable(fundedDeal.title),
			note: fromNullable(fundedDeal.note)
		};

		return { success: true, shareData, deal: fundedDeal };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error creating tip'
		};
	}
};

export const claimTip = async ({
	identity,
	dealId,
	claimCode
}: TipClaimServiceParams): Promise<TipClaimResult> => {
	try {
		assertNonNullish(identity, 'Identity is required to claim a tip');

		const deal = await acceptDealApi({
			identity,
			dealId,
			claimCode
		});

		return { success: true, deal };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error claiming tip'
		};
	}
};

export const previewTip = async ({
	identity,
	dealId
}: TipPreviewServiceParams): Promise<TipPreviewResult> => {
	try {
		assertNonNullish(identity, 'Identity is required to preview a tip');

		const deal = await getClaimableDealApi({
			identity,
			dealId
		});

		return { success: true, deal };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error previewing tip'
		};
	}
};
