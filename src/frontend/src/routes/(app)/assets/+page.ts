import { AppPath } from '$lib/constants/routes.constants';
import { redirect } from '@sveltejs/kit';

export const load = () => {
	throw redirect(307, AppPath.Tokens);
};
