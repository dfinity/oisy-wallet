import TransactionsFilterClearButton from '$lib/components/transactions/filter/TransactionsFilterClearButton.svelte';
import { TRANSACTIONS_FILTER_CLEAR_BUTTON } from '$lib/constants/test-ids.constants';
import { PLAUSIBLE_EVENT_FILTER_MODIFIERS } from '$lib/enums/plausible';
import * as analyticsServices from '$lib/services/analytics.services';
import { transactionsFilterStore } from '$lib/stores/transactions-filter.store';
import { fireEvent, render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('TransactionsFilterClearButton', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		localStorage.clear();
		transactionsFilterStore.clear();
	});

	it('does not render when no filter is active', () => {
		const { queryByTestId } = render(TransactionsFilterClearButton);

		expect(queryByTestId(TRANSACTIONS_FILTER_CLEAR_BUTTON)).toBeNull();
	});

	it('clears the filter store when clicked', async () => {
		transactionsFilterStore.toggleType('send');

		const { getByTestId } = render(TransactionsFilterClearButton);

		await fireEvent.click(getByTestId(TRANSACTIONS_FILTER_CLEAR_BUTTON));

		expect(get(transactionsFilterStore).types).toEqual([]);
	});

	it('tracks a transaction_filter event with modifier=clear when clicked', async () => {
		transactionsFilterStore.toggleType('send');

		const trackSpy = vi
			.spyOn(analyticsServices, 'trackTransactionFilter')
			.mockImplementation(() => {});

		const { getByTestId } = render(TransactionsFilterClearButton);

		await fireEvent.click(getByTestId(TRANSACTIONS_FILTER_CLEAR_BUTTON));

		expect(trackSpy).toHaveBeenCalledWith({
			modifier: PLAUSIBLE_EVENT_FILTER_MODIFIERS.CLEAR
		});
	});
});
