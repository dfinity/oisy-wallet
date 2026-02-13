import type { SyncState } from '$lib/types/sync';

export interface NoParamEvent {}

export type OisySyncStatusEvent = SyncState;

export type OisyIndexCanisterBalanceOutOfSyncEvent = boolean;

export interface OisyReloadCollectionsEvent {
	callback?: () => void;
}
