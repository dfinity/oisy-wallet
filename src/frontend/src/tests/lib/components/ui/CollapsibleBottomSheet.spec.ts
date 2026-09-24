import { screensStore } from '$lib/stores/screens.store';
import CollapsibleBottomSheetTest from '$tests/lib/components/ui/CollapsibleBottomSheetTest.svelte';
import en from '$tests/mocks/i18n.mock';
import { render, waitFor } from '@testing-library/svelte';

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
});
