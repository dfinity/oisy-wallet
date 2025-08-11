import type { SwapErrorCodes } from '$lib/types/swap';

//TODO: revisit throwSwapError
export const throwSwapError = ({
	code,
	message,
	variant,
	swapSucceded
}: {
	code: SwapErrorCodes;
	message?: string;
	variant?: 'error' | 'warning' | 'info';
	swapSucceded?: boolean;
}): never => {
	throw new SwapError(code, message, variant, swapSucceded);
};

export class SwapError extends Error {
	public readonly variant?: 'error' | 'warning' | 'info';
	public readonly swapSucceded?: boolean;

	constructor(
		public readonly code: SwapErrorCodes,
		message?: string,
		variant?: 'error' | 'warning' | 'info',
		swapSucceded?: boolean
	) {
		super(message);
		this.name = 'SwapError';
		this.variant = variant;
		this.swapSucceded = swapSucceded;
	}
}
