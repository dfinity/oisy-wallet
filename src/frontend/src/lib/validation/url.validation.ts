import { z } from 'zod';

export const UrlSchema = z
	.string()
	.url()
	.refine(
		(url): boolean => {
			try {
				const { protocol } = new URL(url);
				return protocol === 'https:';
			} catch (_err: unknown) {
				return false;
			}
		},
		{
			message: 'Invalid URL.'
		}
	);
