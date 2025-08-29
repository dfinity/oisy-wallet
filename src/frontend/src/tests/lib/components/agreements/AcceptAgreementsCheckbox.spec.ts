import { cleanup, fireEvent, render } from '@testing-library/svelte';
import Host from './AcceptAgreementsCheckboxHost.svelte';

// --- Mock i18n store so $i18n.* is available (typed, no any) -----------
vi.mock('$lib/stores/i18n.store', async () => {
	const { readable } = await import('svelte/store');
	const i18n = readable({
		agreements: {
			text: {
				i_have_accepted: 'I have accepted',
				i_have_accepted_updated: 'I have accepted (updated)'
			}
		}
	});
	return { i18n };
});

describe('AcceptAgreementsCheckbox', () => {
	beforeEach(() => {
		cleanup();
	});

	it('renders non-outdated label by default and shows the snippet link', () => {
		const { getByTestId, getByText } = render(Host, {
			props: {
				checked: false,
				inputId: 'accept-1',
				isOutdated: false
			}
		});

		// Label content (inside <Checkbox> slot) should be the non-outdated string
		expect(getByText('I have accepted')).toBeInTheDocument();

		// Snippet should render the anchor we provided in the host
		const link = getByTestId('agreement-link');
		expect(link).toBeInTheDocument();
		expect(link).toHaveAttribute('href', '/agreements');
	});

	it('renders the updated label when isOutdated=true', () => {
		const { getByText } = render(Host, {
			props: {
				checked: false,
				inputId: 'accept-2',
				isOutdated: true
			}
		});

		expect(getByText('I have accepted (updated)')).toBeInTheDocument();
	});

	it('calls onChange when clicked', async () => {
		const onChange = vi.fn();

		const { getByRole } = render(Host, {
			props: {
				checked: false,
				inputId: 'accept-1',
				isOutdated: false,
				onChange
			}
		});

		const checkbox = getByRole('checkbox');

		await fireEvent.click(checkbox);

		expect(onChange).toHaveBeenCalledOnce();
	});

	it('is controlled: click triggers onChange, parent updates checked', async () => {
		const onChange = vi.fn();

		const { getByRole, rerender } = render(Host, {
			props: {
				checked: true,
				inputId: 'accept-4',
				isOutdated: false,
				onChange
			}
		});

		const checkbox = getByRole('checkbox') as HTMLInputElement;

		expect(checkbox.checked).toBe(true);

		await fireEvent.click(checkbox);
		expect(onChange).toHaveBeenCalledOnce();

		await rerender({
			checked: false,
			inputId: 'accept-4',
			isOutdated: false,
			onChange
		});

		expect(checkbox.checked).toBe(false);
	});
});
