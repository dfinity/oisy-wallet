import ConfirmButtonWithModal from '$lib/components/ui/ConfirmButtonWithModal.svelte';
import { CONFIRMATION_MODAL } from '$lib/constants/test-ids.constants';
import { screensStore } from '$lib/stores/screens.store';
import * as screenUtils from '$lib/utils/screens.utils';
import { createMockSnippet } from '$tests/mocks/snippet.mock';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';

const testId = 'mock-button';

const createMockButtonSnippet = () =>
	createRawSnippet((params: () => () => void) => ({
		render: () => `<button data-tid="${testId}">Open Modal</button>`,
		setup: (el) => {
			el.addEventListener('click', params());
		}
	}));

describe('ConfirmButtonWithModal', () => {
	beforeEach(() => {
		vi.spyOn(screenUtils, 'getActiveScreen').mockReturnValue('md');
		screensStore.set('md');
	});

	it('should not render the modal initially', () => {
		const { queryByTestId } = render(ConfirmButtonWithModal, {
			props: {
				title: createMockSnippet('mock-title'),
				button: createMockButtonSnippet(),
				children: createMockSnippet('mock-children'),
				onConfirm: vi.fn(),
				testId: CONFIRMATION_MODAL
			}
		});

		expect(queryByTestId(CONFIRMATION_MODAL)).toBeNull();
	});

	it('should open the modal when the button is clicked', async () => {
		const { getByTestId } = render(ConfirmButtonWithModal, {
			props: {
				title: createMockSnippet('mock-title'),
				button: createMockButtonSnippet(),
				children: createMockSnippet('mock-children'),
				onConfirm: vi.fn(),
				testId: CONFIRMATION_MODAL
			}
		});

		const triggerButton = screen.getByTestId(testId);
		await fireEvent.click(triggerButton);

		expect(getByTestId('mock-title')).toBeInTheDocument();
		expect(getByTestId('mock-children')).toBeInTheDocument();
		expect(getByTestId(CONFIRMATION_MODAL)).toBeInTheDocument();
	});

	it('should close the modal when the cancel button is clicked', async () => {
		const { getByTestId, queryByTestId } = render(ConfirmButtonWithModal, {
			props: {
				title: createMockSnippet('mock-title'),
				button: createMockButtonSnippet(),
				children: createMockSnippet('mock-children'),
				onConfirm: vi.fn(),
				testId: CONFIRMATION_MODAL
			}
		});

		await fireEvent.click(screen.getByTestId(testId)); // open modal

		const cancelBtn = getByTestId(`${CONFIRMATION_MODAL}-cancel`);

		await fireEvent.click(cancelBtn);

		await waitFor(() => {
			expect(queryByTestId(CONFIRMATION_MODAL)).toBeNull();
		});
	});

	it('should call onConfirm when the confirm button is clicked', async () => {
		const onConfirm = vi.fn();
		const { getByTestId, queryByTestId } = render(ConfirmButtonWithModal, {
			props: {
				title: createMockSnippet('mock-title'),
				button: createMockButtonSnippet(),
				children: createMockSnippet('mock-children'),
				onConfirm,
				testId: CONFIRMATION_MODAL
			}
		});

		await fireEvent.click(screen.getByTestId(testId)); // open modal
		const confirmBtn = getByTestId(`${CONFIRMATION_MODAL}-confirm`);
		await fireEvent.click(confirmBtn);

		expect(onConfirm).toHaveBeenCalledOnce();

		// modal should close after confirm
		await waitFor(() => {
			expect(queryByTestId(CONFIRMATION_MODAL)).toBeNull();
		});
	});
});
