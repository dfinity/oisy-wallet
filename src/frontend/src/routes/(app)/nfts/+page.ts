import { AppPath } from '$lib/constants/routes.constants';
import { redirect, type LoadEvent } from '@sveltejs/kit';

// NFTs was renamed to Collectibles; redirect old /nfts/ bookmarks and deep
// links there, preserving query params (e.g. collection/nft ids, network).
export const load = ({ url }: LoadEvent): never => redirect(308, `${AppPath.Nfts}${url.search}`);
