import { goto } from '$app/navigation';
import GoToBorrowButton from '$lib/components/borrowings/GoToBorrowButton.svelte';
import { AppPath } from '$lib/constants/routes.constants';
import { BORROWINGS_GOTO_BUTTON } from '$lib/constants/test-ids.constants';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

vi.mock(import('$app/navigation'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		goto: vi.fn()
	};
});

describe('GoToBorrowButton', () => {
	it('should render the label', () => {
		const { getByText } = render(GoToBorrowButton);

		expect(getByText(en.borrowings.text.go_to_borrow)).toBeInTheDocument();
	});

	it('should render the icon', () => {
		const { container } = render(GoToBorrowButton);

		expect(container.querySelector('svg')).toBeInTheDocument();
	});

	it('should redirect to the borrow page when clicked', () => {
		const { getByTestId } = render(GoToBorrowButton);

		const button = getByTestId(BORROWINGS_GOTO_BUTTON) as HTMLButtonElement;

		button.click();

		expect(goto).toHaveBeenCalledExactlyOnceWith(AppPath.Borrow);
	});
});
