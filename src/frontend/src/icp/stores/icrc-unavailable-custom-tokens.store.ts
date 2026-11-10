import type { IcrcUnavailableCustomToken } from '$icp/types/icrc-custom-token';
import { writable } from 'svelte/store';

export const icrcUnavailableCustomTokensStore = writable<IcrcUnavailableCustomToken[]>([]);
