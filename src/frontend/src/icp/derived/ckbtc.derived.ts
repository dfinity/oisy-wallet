import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
import { tokenId } from '$lib/derived/token.derived';
import { isNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const ckBtcMinterInfoNotLoaded: Readable<boolean> = derived(
	[tokenId, ckBtcMinterInfoStore],
	([$tokenId, $ckBtcMinterInfoStore]) => isNullish($ckBtcMinterInfoStore?.[$tokenId])
);
