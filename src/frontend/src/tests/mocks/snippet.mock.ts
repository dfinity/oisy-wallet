import { createRawSnippet } from 'svelte';

export const createMockSnippet = (testId: string) =>
	createRawSnippet(() => ({
		render: () => `<span data-tid=${testId}>Mock Snippet</span>`
	}));
