import { goto } from '$app/navigation';
import GoToEarnButton from '$lib/components/earning/GoToEarnButton.svelte';
import { AppPath } from '$lib/constants/routes.constants';
import { EARNING_GOTO_BUTTON } from '$lib/constants/test-ids.constants';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

vi.mock(import('$app/navigation'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		goto: vi.fn()
	};
});

describe('GoToEarnButton', () => {
	it('should render the label', () => {
		const { getByText } = render(GoToEarnButton);

		expect(getByText(en.earning.text.go_to_earn)).toBeInTheDocument();
	});

	it('should render the icon', () => {
		const { container } = render(GoToEarnButton);

		expect(container.querySelector('svg')).toBeInTheDocument();
	});

	it('should redirect to the Earn page when clicked', () => {
		const { getByTestId } = render(GoToEarnButton);

		const button = getByTestId(EARNING_GOTO_BUTTON) as HTMLButtonElement;

		button.click();

		expect(goto).toHaveBeenCalledExactlyOnceWith(AppPath.Earn);
	});
});
