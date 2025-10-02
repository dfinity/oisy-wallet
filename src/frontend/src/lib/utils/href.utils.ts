import type { AppPath } from '$lib/constants/routes.constants';

export const pathAsHref = (path: AppPath): string =>
	path.endsWith('/') ? path.slice(0, -1) : path;
