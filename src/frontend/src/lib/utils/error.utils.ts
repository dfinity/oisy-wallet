export const errorDetailToString = (err: unknown): string | undefined =>
	typeof err === 'string'
		? err
		: err instanceof Error
			? err.message
			: 'message' in (err as { message: string })
				? (err as { message: string }).message
				: undefined;
