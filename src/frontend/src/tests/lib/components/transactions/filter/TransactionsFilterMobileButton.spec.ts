import TransactionsFilterMobileButton from '$lib/components/transactions/filter/TransactionsFilterMobileButton.svelte';
import { i18n } from '$lib/stores/i18n.store';
import { transactionsFilterStore } from '$lib/stores/transactions-filter.store';
import { fireEvent, render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('TransactionsFilterMobileButton', () => {
	const getNotificationBlob = (container: HTMLElement) =>
		container.querySelector('.rounded-full.bg-brand-primary');

	beforeEach(() => {
		localStorage.clear();
		transactionsFilterStore.clear();
	});

	it('renders the filter button with the proper aria-label', () => {
		const { getByLabelText } = render(TransactionsFilterMobileButton);

		expect(
			getByLabelText(get(i18n).transaction.filter.open_filters_aria_label)
		).toBeInTheDocument();
	});

	it('hides the blue-dot indicator when no filter is active', () => {
		const { container } = render(TransactionsFilterMobileButton);

		const blob = getNotificationBlob(container);

		expect(blob).toBeInTheDocument();
		expect(blob?.classList.contains('opacity-0')).toBeTruthy();
	});

	it('shows the blue-dot indicator when at least one filter is active', () => {
		transactionsFilterStore.toggleType('send');

		const { container } = render(TransactionsFilterMobileButton);

		const blob = getNotificationBlob(container);

		expect(blob).toBeInTheDocument();
		expect(blob?.classList.contains('opacity-100')).toBeTruthy();
	});

	it('opens the bottom sheet when the button is clicked', async () => {
		const { getByLabelText, getByText } = render(TransactionsFilterMobileButton);

		await fireEvent.click(getByLabelText(get(i18n).transaction.filter.open_filters_aria_label));

		expect(getByText(get(i18n).transaction.filter.sheet_title)).toBeInTheDocument();
	});
});
