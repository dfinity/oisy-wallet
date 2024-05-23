export type QrStatus = 'success' | 'cancelled' | 'token_incompatible';

export type QrResponse = {
	status: QrStatus;
	destination?: string;
	token?: string;
	amount?: number;
};

type DecodedUrnBase = {
	prefix: string;
	destination: string;
	networkId?: string;
	functionName?: string;
};

export const urnNumericParams = ['amount', 'value'] as const;

type NumericParams = {
	[K in (typeof urnNumericParams)[number]]?: number;
};

export const urnStringParams = ['address'] as const;

type StringParams = {
	[K in (typeof urnStringParams)[number]]?: string;
};

export type DecodedUrn = DecodedUrnBase &
	NumericParams &
	StringParams & {
		[key: string]: string | number | undefined;
	};
