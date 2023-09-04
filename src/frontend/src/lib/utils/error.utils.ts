export const errorDetailToString = (err: unknown): string | undefined =>
	typeof err === 'string'
		? (err as string)
		: err instanceof Error
		? (err as Error).message
		: 'message' in (err as unknown as { message: string })
		? (err as unknown as { message: string }).message
		: undefined;
