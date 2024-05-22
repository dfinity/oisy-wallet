export type QrResult = 'success' | 'cancelled' | 'token_incompatible';

export type QrResponse = {
	result: QrResult;
	identifier?: string;
	token?: string;
	amount?: number;
};
