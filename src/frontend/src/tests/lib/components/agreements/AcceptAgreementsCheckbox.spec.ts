import AcceptAgreementsCheckbox from '$lib/components/agreements/AcceptAgreementsCheckbox.svelte';
import { i18n } from '$lib/stores/i18n.store';
import { createMockSnippet } from '$tests/mocks/snippet.mock';
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('AcceptAgreementsCheckbox', () => {
	beforeEach(() => {
		cleanup();
	});

	it('renders non-outdated label by default and shows the snippet link', () => {
		const { getByTestId, getByText } = render(AcceptAgreementsCheckbox, {
			props: {
				checked: false,
				inputId: 'accept-1',
				isOutdated: false,
				agreementLink: createMockSnippet('agreement-link'),
				onChange: vi.fn()
			}
		});

		// Label content (inside <Checkbox> slot) should be the non-outdated string
		expect(getByText(get(i18n).agreements.text.i_have_accepted)).toBeInTheDocument();

		// Snippet should render the anchor we provided in the host
		const link = getByTestId('agreement-link');
		expect(link).toBeInTheDocument();
	});

	it('renders the updated label when isOutdated=true', () => {
		const { getByText } = render(AcceptAgreementsCheckbox, {
			props: {
				checked: false,
				inputId: 'accept-2',
				isOutdated: true,
				agreementLink: createMockSnippet('agreement-link'),
				onChange: vi.fn()
			}
		});

		expect(getByText(get(i18n).agreements.text.i_have_accepted_updated)).toBeInTheDocument();
	});

	it('calls onChange when clicked', async () => {
		const onChange = vi.fn();

		const { getByRole } = render(AcceptAgreementsCheckbox, {
			props: {
				checked: false,
				inputId: 'accept-1',
				isOutdated: false,
				onChange,
				agreementLink: createMockSnippet('agreement-link')
			}
		});

		const checkbox = getByRole('checkbox');

		await fireEvent.click(checkbox);

		expect(onChange).toHaveBeenCalledOnce();
	});

	it('is controlled: click triggers onChange, parent updates checked', async () => {
		const onChange = vi.fn();

		const { getByRole, rerender } = render(AcceptAgreementsCheckbox, {
			props: {
				checked: true,
				inputId: 'accept-4',
				isOutdated: false,
				onChange,
				agreementLink: createMockSnippet('agreement-link')
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
