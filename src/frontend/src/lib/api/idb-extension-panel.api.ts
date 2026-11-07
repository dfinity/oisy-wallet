import { browser } from '$app/environment';
import type { ExtensionPanelSnapshot } from '$lib/types/extension';
import { clear, createStore, get, set as idbSet, type UseStore } from 'idb-keyval';

// There is no IndexedDB in SSG, so the store is only created in the browser (see idb-balances.api.ts).
const createIdbExtensionPanelStore = (): UseStore =>
	browser ? createStore(`oisy-extension-panel`, `snapshot`) : ({} as unknown as UseStore);

const idbExtensionPanelStore = createIdbExtensionPanelStore();

// One snapshot per browser profile: the panel shows the wallet last signed in there.
const SNAPSHOT_KEY = 'snapshot';

export const setIdbExtensionPanelSnapshot = (snapshot: ExtensionPanelSnapshot): Promise<void> =>
	idbSet(SNAPSHOT_KEY, snapshot, idbExtensionPanelStore);

export const getIdbExtensionPanelSnapshot = (): Promise<unknown> =>
	get(SNAPSHOT_KEY, idbExtensionPanelStore);

export const clearIdbExtensionPanelSnapshot = (): Promise<void> => clear(idbExtensionPanelStore);
