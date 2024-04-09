import snses from '$icp/data/snses.json';
import type { CachedSnsDto } from '$icp/types/sns-aggregator';
import { readonly, writable, type Readable } from 'svelte/store';

const snesListStore = writable<CachedSnsDto[]>(snses);
export const snsesStore: Readable<CachedSnsDto[]> = readonly(snesListStore);
