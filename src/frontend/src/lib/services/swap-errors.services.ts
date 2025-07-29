import type { SwapErrorCodes } from '$lib/types/swap';

export const throwSwapError = ({
	code,
	message = undefined,
	variant = undefined
}: {
	code: SwapErrorCodes;
	message?: string;
	variant?: 'error' | 'warning' | 'info';
}): never => {
	console.log('🔥 throwSwapError:', code, message);
	throw new SwapError(code, message, variant);
};

export class SwapError extends Error {
	public readonly variant?: 'error' | 'warning' | 'info';

	constructor(
		public readonly code: SwapErrorCodes,
		message?: string,
		variant?: 'error' | 'warning' | 'info'
	) {
		super(message);
		this.name = 'SwapError';
		this.variant = variant;
	}
}
