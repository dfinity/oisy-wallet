import { browser } from '$app/environment';
import type { Token } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';
import type { LoadEvent } from '@sveltejs/kit';

export const transactionsUrl = (token: Token): string => tokenUrl({ path: 'transactions/', token });

export const rootsUrl = (token: Token): string => tokenUrl({ path: '/', token });

const tokenUrl = ({
	token: { name },
	path
}: {
	token: Token;
	path: 'transactions/' | '/';
}): string => `${path}?token=${encodeURIComponent(name)}`;

export type RouteToken = { token: string | null | undefined };

export const loadRouteToken = ($event: LoadEvent): RouteToken => {
	if (!browser) {
		return {
			token: undefined
		};
	}

	const {
		url: { searchParams }
	} = $event;

	const token = searchParams?.get('token');

	return {
		token: nonNullish(token) ? decodeURIComponent(token) : null
	};
};
