import { createRawSnippet } from 'svelte';

export const createMockSnippet = (testId: string) =>
	createRawSnippet(() => ({
		render: () => `<span data-tid=${testId}>Mock Snippet</span>`
	}));

export const mockSnippetTestId = 'mock-snippet';

export const mockSnippet = createMockSnippet(mockSnippetTestId);
