import type { Component, Snippet } from 'svelte';
import { writable } from 'svelte/store';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface PageExports extends Record<string, any> {
	titleSnippet?: Snippet;
	toolbarSnippet?: Snippet;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface PageProps extends Record<string, any> {}

export type PageComponent<P extends PageProps, E extends PageExports> = Component<P, E>;

export interface PageDefinition<P extends PageProps, E extends PageExports> {
	component: PageComponent<P, E>;
	props: P;
}

const createMultiPageModalStore = () => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const { subscribe, update, set } = writable<PageDefinition<any, any>[]>([]);

	return {
		subscribe,
		open<P extends PageProps, E extends PageExports>({
			component,
			props
		}: {
			component: PageComponent<P, E>;
			props: P;
		}) {
			update((pages) => [...pages, { component, props }]);
		},
		close() {
			update((pages) => {
				const newPages = [...pages];
				newPages.pop();
				return newPages;
			});
		},
		reset() {
			set([]);
		}
	};
};

export const multiPageModalStore = createMultiPageModalStore();
