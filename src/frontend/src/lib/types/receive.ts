import type { Token } from '$lib/types/token';

export interface ReceiveQRCode {
	address: string;
	addressLabel?: string;
	addressToken: Token;
	qrCodeAriaLabel?: string;
	copyAriaLabel: string;
}

export type ReceiveQRCodeAction =
	| { enabled: true; ariaLabel: string; testId?: string; onClick: () => void }
	| { enabled: false };
