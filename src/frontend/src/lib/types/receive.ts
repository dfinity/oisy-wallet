import type { Token } from '$lib/types/token';

export interface ReceiveQRCode {
	address: string;
	addressLabel?: string;
	addressToken: Token;
}
