import type {
	CancelQrGiftCodeResponse,
	CreateQrGiftCodeResponse,
	QrGiftCodeEntry,
	QrGiftCodeInfoResponse,
	QrGiftCodeValidity,
	RedeemQrGiftCodeResponse
} from '$declarations/rewards/rewards.did';
import { GIFT_CODE_MOCK_ENABLED } from '$env/gift-code.env';
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

// --- Mock helpers (active by default, set VITE_GIFT_CODE_MOCK_DISABLED=true to use real calls) ---

const MOCK_DELAY_MS = 1500;

const mockDelay = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));

const generateMockCode = (): string =>
	Array.from(crypto.getRandomValues(new Uint8Array(16)))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');

const mockValidity = (status: 'Valid' | 'Used' | 'Expired' | 'Cancelled'): QrGiftCodeValidity => {
	switch (status) {
		case 'Valid':
			return { Valid: null };
		case 'Used':
			return { Used: null };
		case 'Expired':
			return { Expired: null };
		case 'Cancelled':
			return { Cancelled: null };
	}
};

const MOCK_ICP_LEDGER = Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai');
const MOCK_CKUSDC_LEDGER = Principal.fromText('xevnm-gaaaa-aaaar-qafnq-cai');
const nowNs = BigInt(Date.now()) * 1_000_000n;

const MOCK_SEED_CODES: QrGiftCodeEntry[] = [
	{
		code: 'a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b8',
		tokens: [{ ledger: MOCK_ICP_LEDGER, amount: 150_000_000n }],
		validity: mockValidity('Valid'),
		created_at: nowNs - 3_600_000_000_000n,
		expiry_date: nowNs + 86_400_000_000_000n
	},
	{
		code: 'b2c3d4e5f6a7b8c9b2c3d4e5f6a7b8c9',
		tokens: [{ ledger: MOCK_CKUSDC_LEDGER, amount: 3_500_000n }],
		validity: mockValidity('Valid'),
		created_at: nowNs - 7_200_000_000_000n,
		expiry_date: nowNs + 604_800_000_000_000n
	},
	{
		code: 'c3d4e5f6a7b8c9d0c3d4e5f6a7b8c9d0',
		tokens: [{ ledger: MOCK_ICP_LEDGER, amount: 75_000_000n }],
		validity: mockValidity('Used'),
		created_at: nowNs - 86_400_000_000_000n,
		expiry_date: nowNs + 518_400_000_000_000n
	},
	{
		code: 'd4e5f6a7b8c9d0e1d4e5f6a7b8c9d0e1',
		tokens: [{ ledger: MOCK_CKUSDC_LEDGER, amount: 5_000_000n }],
		validity: mockValidity('Used'),
		created_at: nowNs - 172_800_000_000_000n,
		expiry_date: nowNs + 432_000_000_000_000n
	},
	{
		code: 'e5f6a7b8c9d0e1f2e5f6a7b8c9d0e1f2',
		tokens: [{ ledger: MOCK_ICP_LEDGER, amount: 200_000_000n }],
		validity: mockValidity('Expired'),
		created_at: nowNs - 604_800_000_000_000n,
		expiry_date: nowNs - 3_600_000_000_000n
	},
	{
		code: 'f6a7b8c9d0e1f2a3f6a7b8c9d0e1f2a3',
		tokens: [{ ledger: MOCK_CKUSDC_LEDGER, amount: 2_000_000n }],
		validity: mockValidity('Cancelled'),
		created_at: nowNs - 259_200_000_000_000n,
		expiry_date: nowNs + 345_600_000_000_000n
	}
];

let mockCodes: QrGiftCodeEntry[] = [...MOCK_SEED_CODES];

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
	if (GIFT_CODE_MOCK_ENABLED) {
		await mockDelay();
		const code = generateMockCode();
		const nowNs = BigInt(Date.now()) * 1_000_000n;
		const expiryNs = nowNs + expirySeconds * 1_000_000_000n;
		mockCodes = [
			{
				code,
				tokens: [{ ledger: Principal.fromText(ledgerCanisterId), amount }],
				validity: mockValidity('Valid'),
				created_at: nowNs,
				expiry_date: expiryNs
			},
			...mockCodes
		];
		return { success: true, code };
	}

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
	if (GIFT_CODE_MOCK_ENABLED) {
		await mockDelay();
		const entry = mockCodes.find((e) => e.code === code);
		if (entry) {
			entry.validity = mockValidity('Used');
		}
		return { success: true };
	}

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
		const errorMessage = err instanceof Error ? err.message : get(i18n).gift_code.error.redeeming;
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
	if (GIFT_CODE_MOCK_ENABLED) {
		await mockDelay();
		const entry = mockCodes.find((e) => e.code === code);
		if (entry) {
			entry.validity = mockValidity('Cancelled');
		}
		toastsShow({
			text: get(i18n).gift_code.list.text.cancel_success,
			level: 'success',
			duration: 3000
		});
		return { success: true };
	}

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
	if (GIFT_CODE_MOCK_ENABLED) {
		await mockDelay();
		return mockCodes;
	}

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
	if (GIFT_CODE_MOCK_ENABLED) {
		const entry = mockCodes.find((e) => e.code === code);
		if (entry) {
			return { tokens: entry.tokens, validity: entry.validity, expiry_date: entry.expiry_date };
		}
		return {
			tokens: [],
			validity: mockValidity('Valid'),
			expiry_date: BigInt(Date.now() + 86_400_000) * 1_000_000n
		};
	}

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
