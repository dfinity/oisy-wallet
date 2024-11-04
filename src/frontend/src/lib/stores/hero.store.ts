import { derived, writable, type Readable, type Writable } from 'svelte/store';

export interface HeroContext {
	loading: Writable<boolean>;
	loaded: Readable<boolean>;
	isExpenseActionsDisabled: Writable<boolean>;
}

export const initHeroContext = (): HeroContext => {
	const loading = writable<boolean>(true);
	const loaded = derived(loading, ($loading) => !$loading);

	const isExpenseActionsDisabled = writable<boolean>(true);

	return {
		loading,
		loaded,
		isExpenseActionsDisabled
	};
};

export const HERO_CONTEXT_KEY = Symbol('hero');
