import HelpMenu from '$lib/components/core/HelpMenu.svelte';
import { NAVIGATION_MENU, NAVIGATION_MENU_BUTTON } from '$lib/constants/test-ids.constants';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

describe('HelpMenu', () => {
	it('should render the menu button', () => {
		const { getByTestId } = render(HelpMenu);

		expect(getByTestId(NAVIGATION_MENU_BUTTON)).toBeInTheDocument();
	});

	it('should initialize with the menu not rendered', () => {
		const { queryByTestId } = render(HelpMenu);

		expect(queryByTestId(NAVIGATION_MENU)).toBeNull();
	});

	it('should render the menu if the button is clicked', async () => {
		const { getByTestId } = render(HelpMenu);

		await fireEvent.click(getByTestId(NAVIGATION_MENU_BUTTON));

		expect(getByTestId(NAVIGATION_MENU)).toBeInTheDocument();
	});

	it('should not close the menu if the button is clicked again', async () => {
		const { getByTestId } = render(HelpMenu);

		await fireEvent.click(getByTestId(NAVIGATION_MENU_BUTTON));

		expect(getByTestId(NAVIGATION_MENU)).toBeInTheDocument();

		await fireEvent.click(getByTestId(NAVIGATION_MENU_BUTTON));

		expect(getByTestId(NAVIGATION_MENU)).toBeInTheDocument();
	});

	it('should close the menu if it is clicked upon', async () => {
		const { getByTestId, queryByTestId } = render(HelpMenu);

		await fireEvent.click(getByTestId(NAVIGATION_MENU_BUTTON));

		expect(getByTestId(NAVIGATION_MENU)).toBeInTheDocument();

		await fireEvent.click(getByTestId(NAVIGATION_MENU_BUTTON));

		expect(getByTestId(NAVIGATION_MENU)).toBeInTheDocument();

		await fireEvent.click(getByTestId(NAVIGATION_MENU));

		await waitFor(() => {
			expect(queryByTestId(NAVIGATION_MENU)).toBeNull();
		});
	});
});
