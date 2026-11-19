import { AppPath } from '$lib/constants/routes.constants';
import { redirect, type LoadEvent } from '@sveltejs/kit';

// Rewards moved out of Earn to the standalone /rewards/ page; redirect old
// /earn/rewards/ bookmarks there, preserving the network query param.
export const load = ({ url }: LoadEvent): never => redirect(308, `${AppPath.Rewards}${url.search}`);
