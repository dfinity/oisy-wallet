import type { ClaimableDealView } from '$declarations/escrow/escrow.did';
import type { TipShareData } from '$lib/types/tip';
import type { Token } from '$lib/types/token';
import type { Nullish } from '@dfinity/zod-schemas';
import { writable, type Readable } from 'svelte/store';

export interface TipWizardState {
	token?: Token;
	amount?: bigint;
	title?: string;
	note?: string;
	expiresAtNs?: bigint;
	shareData?: TipShareData;
	error?: string;
}

export interface TipWizardStore extends Readable<TipWizardState> {
	setToken: (token: Token) => void;
	setAmount: (amount: bigint) => void;
	setTitle: (title: string) => void;
	setNote: (note: string) => void;
	setExpiresAtNs: (expiresAtNs: bigint) => void;
	setShareData: (shareData: TipShareData) => void;
	setError: (error: string) => void;
	reset: () => void;
}

const initTipWizardStore = (): TipWizardStore => {
	const { subscribe, set, update } = writable<TipWizardState>({});

	return {
		subscribe,
		setToken: (token: Token) => update((state) => ({ ...state, token })),
		setAmount: (amount: bigint) => update((state) => ({ ...state, amount })),
		setTitle: (title: string) => update((state) => ({ ...state, title })),
		setNote: (note: string) => update((state) => ({ ...state, note })),
		setExpiresAtNs: (expiresAtNs: bigint) => update((state) => ({ ...state, expiresAtNs })),
		setShareData: (shareData: TipShareData) => update((state) => ({ ...state, shareData })),
		setError: (error: string) => update((state) => ({ ...state, error })),
		reset: () => set({})
	};
};

export const tipWizardStore = initTipWizardStore();

export interface TipClaimState {
	dealId?: bigint;
	claimCode?: string;
	preview?: ClaimableDealView;
	claiming?: boolean;
	error?: string;
	success?: boolean;
}

export type TipClaimStoreData = Nullish<TipClaimState>;

export interface TipClaimStore extends Readable<TipClaimStoreData> {
	set: (state: TipClaimState) => void;
	reset: () => void;
}

const initTipClaimStore = (): TipClaimStore => {
	const { subscribe, set } = writable<TipClaimStoreData>(undefined);

	return {
		subscribe,
		set,
		reset: () => set(undefined)
	};
};

export const tipClaimStore = initTipClaimStore();
