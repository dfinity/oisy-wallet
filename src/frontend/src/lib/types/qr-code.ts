export type QrStatus = 'success' | 'cancelled' | 'token_incompatible';

export type QrResponse = {
	status: QrStatus;
	destination?: string;
	token?: string;
	amount?: number;
};
