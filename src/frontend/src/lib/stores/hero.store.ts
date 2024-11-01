import { derived, writable, type Readable, type Writable } from 'svelte/store';

export interface HeroContext {
	loading: Writable<boolean>;
	loaded: Readable<boolean>;
}

export const initHeroContext = (): HeroContext => {
	const loading = writable<boolean>(true);

	const loaded = derived(loading, ($loading) => !$loading);

	return {
		loading,
		loaded
	};
};

export const HERO_CONTEXT_KEY = Symbol('hero');
