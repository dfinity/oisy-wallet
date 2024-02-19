import { AIRDROP } from '$airdrop/constants/airdrop.constants';
import { airdropStore } from '$airdrop/stores/airdrop.store';
import type { CodeText } from '$airdrop/types/airdrop';
import { page } from '$app/stores';
import { isRouteTokens } from '$lib/utils/nav.utils';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const airdropCode: Readable<CodeText | null | undefined> = derived([page], ([$page]) => {
	const {
		data: { airdropCode }
	} = $page;

	return airdropCode;
});

export const airdropAvailable: Readable<boolean> = derived(
	[page, airdropStore],
	([$page, $airdrop]) => nonNullish($airdrop) && AIRDROP && isRouteTokens($page)
);
