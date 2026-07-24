import type { QrGiftToken } from '$declarations/rewards/rewards.did';

export interface GiftCodeRedeemStateData {
	success: boolean;
	code: string;
	tokens?: QrGiftToken[];
	error?: string;
}
