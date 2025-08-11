import { AppPath } from '$lib/constants/routes.constants';
import { redirect } from '@sveltejs/kit';

export const load = () => {
	throw redirect(308, AppPath.Tokens); // 308 permanent redirect status code
};
