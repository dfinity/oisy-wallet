import type { TokenMetadata } from '$lib/types/token';
import { UrlSchema } from '$lib/validation/url.validation';

export const hardenMetadata = <T extends TokenMetadata>({ icon, ...rest }: T): T => {
	const { success } = UrlSchema.safeParse(icon);

	return { ...rest, icon: success ? icon : undefined } as T;
};
