import type { SwapErrorKey } from '$lib/types/swap';

export const throwSwapError = ({
	code,
	message
}: {
	code: SwapErrorKey;
	message: string;
}): never => {
	throw new SwapError(code, message);
};

export class SwapError extends Error {
	constructor(
		public readonly code: SwapErrorKey,
		message: string
	) {
		super(message);
		this.name = 'SwapError';
	}
}
