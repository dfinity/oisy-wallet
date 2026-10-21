import { screensStore } from '$lib/stores/screens.store';
import CollapsibleBottomSheetTest from '$tests/lib/components/ui/CollapsibleBottomSheetTest.svelte';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render, waitFor, within } from '@testing-library/svelte';

describe('CollapsibleBottomSheet', () => {
	beforeEach(() => {
		// The trigger and the sheet only exist on the small-screen branch; large screens expand in
		// place instead.
		screensStore.set('xs');
	});

	it('falls back to the info-icon button when no trigger is given', async () => {
		const { getByLabelText, queryByTestId } = render(CollapsibleBottomSheetTest);

		await waitFor(() => {
			expect(getByLabelText(en.core.alt.open_details)).toBeInTheDocument();
			expect(queryByTestId('custom-trigger')).not.toBeInTheDocument();
		});
	});

	it('replaces the default button with a caller-supplied trigger', async () => {
		const { getByTestId, queryByLabelText } = render(CollapsibleBottomSheetTest, {
			props: { withTrigger: true }
		});

		await waitFor(() => {
			expect(getByTestId('custom-trigger')).toBeInTheDocument();
			expect(queryByLabelText(en.core.alt.open_details)).not.toBeInTheDocument();
		});
	});

	it('opens the sheet from the supplied trigger and titles it', async () => {
		const sheetTitle = 'Priority';

		const { getByTestId, queryByText } = render(CollapsibleBottomSheetTest, {
			props: { withTrigger: true, sheetTitle }
		});

		await waitFor(() => {
			expect(queryByText(sheetTitle)).not.toBeInTheDocument();
		});

		getByTestId('custom-trigger').click();

		await waitFor(() => {
			expect(queryByText(sheetTitle)).toBeInTheDocument();
		});
	});

	it('omits the title when none is given', async () => {
		const { getByTestId, getByLabelText } = render(CollapsibleBottomSheetTest, {
			props: { withTrigger: true }
		});

		getByTestId('custom-trigger').click();

		await waitFor(() => {
			expect(getByLabelText(en.core.alt.close_details)).toBeInTheDocument();
		});
	});

	it('contains focus and dismisses only the mobile sheet above a parent modal', async () => {
		const onCloseModal = vi.fn();
		const { getByTestId, getByRole, queryByTestId } = render(CollapsibleBottomSheetTest, {
			props: { withTrigger: true, sheetTitle: 'Priority', withinModal: true, onCloseModal }
		});
		const trigger = getByTestId('custom-trigger');
		trigger.focus();
		await fireEvent.click(trigger);
		const sheet = within(getByTestId('bottom-sheet'));
		const close = sheet.getByRole('button', { name: en.core.alt.close_details });
		const action = sheet.getByRole('button', { name: 'Sheet action' });
		await waitFor(() => expect(document.activeElement).toBe(close));

		await fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });

		expect(document.activeElement).toBe(action);

		await fireEvent.keyDown(action, { key: 'Tab' });

		expect(document.activeElement).toBe(close);

		await fireEvent.keyDown(close, { key: 'Escape' });
		await waitFor(() => expect(queryByTestId('bottom-sheet')).not.toBeInTheDocument());

		expect(onCloseModal).not.toHaveBeenCalled();
		expect(getByRole('dialog', { name: 'Parent dialog' })).toBeInTheDocument();
		expect(document.activeElement).toBe(trigger);
	});
});
