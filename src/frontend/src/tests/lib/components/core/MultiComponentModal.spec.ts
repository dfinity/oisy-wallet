import ModalMock from '$tests/mocks/modal.component.mock.svelte';
// Mock the Modal component from @dfinity/gix-components because with the real
// component some `if` and `else` blocks occasionally renders simultaneously.
vi.mock('@dfinity/gix-components', () => ({
	Modal: ModalMock
}));

import MultiComponentModal from '$lib/components/core/MultiComponentModal.svelte';
import { render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { vi } from 'vitest';
import TestModalComponent from './TestModalComponent.svelte';
import TestModalNoSnippets from './TestModalNoSnippets.svelte';

describe('MultiComponentModal', () => {
	let subject: MultiComponentModal;

	beforeEach(() => {
		// Create a fresh instance for each test
		const { component } = render(MultiComponentModal);
		subject = component as MultiComponentModal;
	});

	it('should export open and close functions', () => {
		expect(typeof subject.open).toBe('function');
		expect(typeof subject.close).toBe('function');
	});

	it('should open a modal with the provided component and props', async () => {
		// Open a modal with TestModalComponent
		subject.open({ component: TestModalComponent, props: { testProp: 'test value' } });
		await tick();

		// Check if the modal content is rendered
		const modalContent = await screen.findByTestId('test-modal-content');
		expect(modalContent.textContent).toContain('Test Modal Content: test value');
	});

	it('should close a modal when close is called', async () => {
		// Open a modal first
		subject.open({ component: TestModalComponent, props: { testProp: 'test value' } });
		await tick();

		// Verify modal is open
		expect(screen.queryByTestId('test-modal-content')).toBeVisible();

		// Close the modal
		subject.close();
		await tick();

		// Modal should no longer be visible
		expect(screen.queryByTestId('test-modal-content')).toBeNull();
	});

	it('should stack multiple modals and show only the top one', async () => {
		// Open first modal
		subject.open({ component: TestModalComponent, props: { testProp: 'first modal' } });
		await tick();

		// Open second modal
		subject.open({ component: TestModalNoSnippets, props: { testProp: 'second modal' } });
		await tick();

		// Only the second modal should be visible
		expect(screen.queryByTestId('test-modal-no-snippets')).toBeVisible();
		expect(screen.queryByTestId('test-modal-content')).not.toBeVisible();

		// Close the top modal
		subject.close();
		await tick();

		// Now the first modal should be visible
		expect(screen.queryByTestId('test-modal-no-snippets')).toBeNull();
		expect(screen.queryByTestId('test-modal-content')).toBeVisible();

		// Close the last modal
		subject.close();
		await tick();

		// No modals should be visible
		expect(screen.queryByTestId('test-modal-no-snippets')).toBeNull();
		expect(screen.queryByTestId('test-modal-content')).toBeNull();
	});

	it('should render title snippet from the modal component', async () => {
		// Open a modal with a component that has a titleSnippet function
		subject.open({ component: TestModalComponent, props: { testProp: 'with title' } });
		await tick();

		// The title should be rendered
		await screen.findByText('Test Title: with title');
	});

	it('should render toolbar snippet from the modal component', async () => {
		// Open a modal with a component that has a toolbarSnippet function
		subject.open({ component: TestModalComponent, props: { testProp: 'with toolbar' } });
		await tick();

		// The toolbar should be rendered
		await screen.findByText('Test Toolbar: with toolbar');
	});

	it('should handle components without snippets', async () => {
		// Open a modal with a component that doesn't have snippet functions
		subject.open({ component: TestModalNoSnippets, props: { testProp: 'no snippets' } });
		await tick();

		// The modal content should be rendered
		const modalContent = await screen.findByTestId('test-modal-no-snippets');
		expect(modalContent.textContent).toContain('Test Modal Without Snippets: no snippets');

		// But no title or toolbar snippets should be rendered
		expect(screen.queryByText(/Test Title:/)).toBeNull();
		expect(screen.queryByText(/Test Toolbar:/)).toBeNull();
	});
});
