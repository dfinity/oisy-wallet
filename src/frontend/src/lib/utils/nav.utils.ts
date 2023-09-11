import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import type { Token } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';
import type { LoadEvent, Page } from '@sveltejs/kit';

export const transactionsUrl = (token: Token): string => tokenUrl({ path: 'transactions/', token });

export const isRouteTransactions = ({ route: { id } }: Page): boolean =>
	id === '/(app)/transactions';

const tokenUrl = ({
	token: { name },
	path
}: {
	token: Token;
	path: 'transactions/' | '/';
}): string =>
	`${path}?token=${encodeURIComponent(
		name.replace(/\p{Emoji}/gu, (m, idx) => `\\u${m.codePointAt(0)?.toString(16)}`)
	)}`;

export const back = async (pop: boolean) => {
	if (!pop) {
		await goto('/');
		return;
	}

	history.back();
};

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

	const replaceEmoji = (input: string | null): string | null => {
		if (input === null) {
			return null;
		}

		return input.replace(/\\u([\dA-Fa-f]+)/g, (_match, hex) =>
			String.fromCodePoint(Number(`0x${hex}`))
		);
	};

	return {
		token: nonNullish(token) ? replaceEmoji(decodeURIComponent(token)) : null
	};
};
