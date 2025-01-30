import { mockPage } from '$tests/mocks/page.store.mock';
import { HttpAgent } from '@dfinity/agent';
import '@testing-library/jest-dom';
import { configure } from '@testing-library/svelte';
import 'fake-indexeddb/auto';
import { vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

vi.mock('$app/stores', () => ({
	page: mockPage
}));

vi.mock(import('$lib/actors/agents.ic'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		// eslint-disable-next-line require-await
		getAgent: async () => mock<HttpAgent>()
	};
});

configure({
	testIdAttribute: 'data-tid'
});
