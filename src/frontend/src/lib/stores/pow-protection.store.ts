import { writable, type Readable } from 'svelte/store';

export interface PowProtectorProgressData {
	progress: 'REQUEST_CHALLENGE' | 'SOLVE_CHALLENGE' | 'GRANT_CYCLES';
}

export interface PowProtectorNextAllowanceData {
	nextAllowanceMs?: bigint;
}

export interface PowProtectorProgressStore extends Readable<PowProtectorProgressData> {
	setPowProtectorProgressData: (data: PowProtectorProgressData) => void;
}

export interface PowProtectorNextAllowanceStore extends Readable<PowProtectorNextAllowanceData> {
	setPowProtectorNextAllowanceData: (data: PowProtectorNextAllowanceData) => void;
}

export const initPowProtectorProgressStore = (): PowProtectorProgressStore => {
	const { subscribe, set } = writable<PowProtectorProgressData>(undefined);
	return {
		subscribe,
		setPowProtectorProgressData: set
	};
};

export const initPowProtectorNextAllowanceStore = (): PowProtectorNextAllowanceStore => {
	const { subscribe, set } = writable<PowProtectorNextAllowanceData>(undefined);
	return {
		subscribe,
		setPowProtectorNextAllowanceData: set
	};
};

export const powProtectoreProgressStore = initPowProtectorProgressStore();

export const powProtectoreNextAllowanceStore = initPowProtectorNextAllowanceStore();
