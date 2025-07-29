import type { SwapErrorCodes } from '$lib/types/swap';

export const throwSwapError = ({
	code,
	message = undefined
}: {
	code: SwapErrorCodes;
	message?: string;
}): never => {
	console.log("🔥 throwSwapError:", code);
	throw new SwapError(code, message);
};

export class SwapError extends Error {
	constructor(
		public readonly code: SwapErrorCodes,
		message?: string
	) {
		super(message);
		this.name = 'SwapError';
	}
}
