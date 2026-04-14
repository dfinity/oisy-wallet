import type {
	CancelQrGiftCodeResponse,
	CreateQrGiftCodeResponse,
	QrGiftCodeEntry,
	QrGiftCodeInfoResponse,
	RedeemQrGiftCodeResponse
} from '$declarations/rewards/rewards.did';
import { approve, transactionFee } from '$icp/api/icrc-ledger.api';
import {
	cancelQrGiftCode as cancelQrGiftCodeApi,
	createQrGiftCode as createQrGiftCodeApi,
	getMyQrGiftCodes as getMyQrGiftCodesApi,
	getQrGiftCodeInfo as getQrGiftCodeInfoApi,
	redeemQrGiftCode as redeemQrGiftCodeApi
} from '$lib/api/reward.api';
import { NANO_SECONDS_IN_MINUTE, REWARDS_CANISTER_ID } from '$lib/constants/app.constants';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError, toastsShow } from '$lib/stores/toasts.store';
import {
	GiftCodeAlreadyRedeemedError,
	GiftCodeCancelledError,
	GiftCodeExpiredError,
	GiftCodeInsufficientAllowanceError,
	GiftCodeInvalidError,
	GiftCodeSelfRedeemError,
	GiftCodeTransferFailedError
} from '$lib/types/errors';
import type { Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { nowInBigIntNanoSeconds } from '@dfinity/utils';
import { get } from 'svelte/store';

const APPROVAL_EXPIRY_MINUTES = 5n;

export const createGiftCode = async ({
	identity,
	ledgerCanisterId,
	amount,
	expirySeconds
}: {
	identity: Identity;
	ledgerCanisterId: string;
	amount: bigint;
	expirySeconds: bigint;
}): Promise<{ success: boolean; code?: string }> => {
	try {
		const fee = await transactionFee({
			identity,
			ledgerCanisterId
		});

		const approvalAmount = amount + fee;

		await approve({
			identity,
			ledgerCanisterId,
			amount: approvalAmount,
			spender: { owner: Principal.fromText(REWARDS_CANISTER_ID) },
			expiresAt: nowInBigIntNanoSeconds() + APPROVAL_EXPIRY_MINUTES * NANO_SECONDS_IN_MINUTE
		});

		const response: CreateQrGiftCodeResponse = await createQrGiftCodeApi({
			identity,
			request: {
				tokens: [
					{
						ledger: Principal.fromText(ledgerCanisterId),
						amount
					}
				],
				expiry_seconds: expirySeconds
			}
		});

		if ('Success' in response) {
			return { success: true, code: response.Success.code };
		}

		if ('InsufficientAllowance' in response) {
			throw new GiftCodeInsufficientAllowanceError();
		}

		if ('InvalidTokens' in response) {
			throw new GiftCodeInvalidError('Invalid tokens');
		}

		if ('InvalidExpiry' in response) {
			throw new GiftCodeInvalidError('Invalid expiry');
		}

		if ('LedgerQueryFailed' in response) {
			throw new Error('Ledger query failed');
		}

		if ('AnonymousCaller' in response) {
			throw new Error('Anonymous caller');
		}

		throw new Error('Unknown error creating gift code');
	} catch (err: unknown) {
		toastsError({
			msg: { text: get(i18n).gift_code.error.creating },
			err
		});
		return { success: false };
	}
};

export const redeemGiftCode = async ({
	identity,
	code
}: {
	identity: Identity;
	code: string;
}): Promise<{ success: boolean; error?: string }> => {
	try {
		const response: RedeemQrGiftCodeResponse = await redeemQrGiftCodeApi({
			identity,
			request: { code }
		});

		if ('Success' in response) {
			return { success: true };
		}

		const labels = get(i18n).gift_code.redeem.text;

		if ('InvalidCode' in response) {
			throw new GiftCodeInvalidError(labels.invalid_code);
		}

		if ('AlreadyRedeemed' in response) {
			throw new GiftCodeAlreadyRedeemedError(labels.already_redeemed);
		}

		if ('Expired' in response) {
			throw new GiftCodeExpiredError(labels.expired);
		}

		if ('Cancelled' in response) {
			throw new GiftCodeCancelledError(labels.cancelled);
		}

		if ('SelfRedeem' in response) {
			throw new GiftCodeSelfRedeemError(labels.self_redeem);
		}

		if ('TransferFailed' in response) {
			throw new GiftCodeTransferFailedError(labels.transfer_failed);
		}

		throw new Error('Unknown error redeeming gift code');
	} catch (err: unknown) {
		const errorMessage =
			err instanceof Error ? err.message : get(i18n).gift_code.error.redeeming;
		return { success: false, error: errorMessage };
	}
};

export const cancelGiftCode = async ({
	identity,
	code
}: {
	identity: Identity;
	code: string;
}): Promise<{ success: boolean }> => {
	try {
		const response: CancelQrGiftCodeResponse = await cancelQrGiftCodeApi({
			identity,
			code
		});

		if ('Success' in response) {
			toastsShow({
				text: get(i18n).gift_code.list.text.cancel_success,
				level: 'success',
				duration: 3000
			});
			return { success: true };
		}

		if ('InvalidCode' in response) {
			throw new GiftCodeInvalidError();
		}

		if ('NotOwner' in response) {
			throw new Error('Not the owner of this gift code');
		}

		if ('AlreadyRedeemed' in response) {
			throw new GiftCodeAlreadyRedeemedError();
		}

		throw new Error('Unknown error cancelling gift code');
	} catch (err: unknown) {
		toastsError({
			msg: { text: get(i18n).gift_code.error.cancelling },
			err
		});
		return { success: false };
	}
};

export const loadMyGiftCodes = async ({
	identity
}: {
	identity: Identity;
}): Promise<QrGiftCodeEntry[]> => {
	try {
		return await getMyQrGiftCodesApi({
			identity,
			certified: false
		});
	} catch (err: unknown) {
		toastsError({
			msg: { text: get(i18n).gift_code.error.loading },
			err
		});
		return [];
	}
};

export const getGiftCodeInfo = async ({
	identity,
	code
}: {
	identity: Identity;
	code: string;
}): Promise<QrGiftCodeInfoResponse | undefined> => {
	try {
		return await getQrGiftCodeInfoApi({
			identity,
			code,
			certified: false
		});
	} catch (err: unknown) {
		toastsError({
			msg: { text: get(i18n).gift_code.error.loading },
			err
		});
		return undefined;
	}
};
