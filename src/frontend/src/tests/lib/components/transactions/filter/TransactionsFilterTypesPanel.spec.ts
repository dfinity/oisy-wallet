import TransactionsFilterTypesPanel from '$lib/components/transactions/filter/TransactionsFilterTypesPanel.svelte';
import { PLAUSIBLE_EVENT_EVENTS_KEYS, PLAUSIBLE_EVENT_FILTER_ACTIONS } from '$lib/enums/plausible';
import * as analyticsServices from '$lib/services/analytics.services';
import { i18n } from '$lib/stores/i18n.store';
import { transactionsFilterStore } from '$lib/stores/transactions-filter.store';
import { fireEvent, render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('TransactionsFilterTypesPanel', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		localStorage.clear();
		transactionsFilterStore.clear();
	});

	it('renders one row per known transaction type, sorted alphabetically', () => {
		const { container } = render(TransactionsFilterTypesPanel);

		const labels = Array.from(container.querySelectorAll('li span.text-sm')).map(
			(el) => el.textContent?.trim() ?? ''
		);

		const expected = ['Approve', 'Burn', 'Deposit', 'Mint', 'Receive', 'Send', 'Withdraw'];

		expect(labels).toEqual(expected);
	});

	it('reflects the store as the checked state', () => {
		transactionsFilterStore.toggleType('send');

		const { container } = render(TransactionsFilterTypesPanel);

		const sendInput = container.querySelector<HTMLInputElement>(
			'input[id="transactions-filter-type-send"]'
		);
		const receiveInput = container.querySelector<HTMLInputElement>(
			'input[id="transactions-filter-type-receive"]'
		);

		expect(sendInput?.checked).toBeTruthy();
		expect(receiveInput?.checked).toBeFalsy();
	});

	it('toggles the corresponding type in the store when a checkbox changes', async () => {
		const { container } = render(TransactionsFilterTypesPanel);

		const sendInput = container.querySelector<HTMLInputElement>(
			'input[id="transactions-filter-type-send"]'
		);

		expect(sendInput).not.toBeNull();

		await fireEvent.click(sendInput as HTMLInputElement);

		expect(get(transactionsFilterStore).types).toEqual(['send']);

		await fireEvent.click(sendInput as HTMLInputElement);

		expect(get(transactionsFilterStore).types).toEqual([]);
	});

	it('uses the localised label from the i18n store', () => {
		const { getByText } = render(TransactionsFilterTypesPanel);

		expect(getByText(get(i18n).transaction.type.send)).toBeInTheDocument();
		expect(getByText(get(i18n).transaction.type.receive)).toBeInTheDocument();
	});

	it('tracks an activity filter event with action=add when a type is selected', async () => {
		const trackSpy = vi
			.spyOn(analyticsServices, 'trackActivityFilter')
			.mockImplementation(() => {});

		const { container } = render(TransactionsFilterTypesPanel);

		const sendInput = container.querySelector<HTMLInputElement>(
			'input[id="transactions-filter-type-send"]'
		);

		await fireEvent.click(sendInput as HTMLInputElement);

		expect(trackSpy).toHaveBeenCalledWith({
			key: PLAUSIBLE_EVENT_EVENTS_KEYS.TYPE,
			value: 'send',
			action: PLAUSIBLE_EVENT_FILTER_ACTIONS.ADD
		});
	});

	it('tracks an activity filter event with action=remove when a type is unselected', async () => {
		transactionsFilterStore.toggleType('send');

		const trackSpy = vi
			.spyOn(analyticsServices, 'trackActivityFilter')
			.mockImplementation(() => {});

		const { container } = render(TransactionsFilterTypesPanel);

		const sendInput = container.querySelector<HTMLInputElement>(
			'input[id="transactions-filter-type-send"]'
		);

		await fireEvent.click(sendInput as HTMLInputElement);

		expect(trackSpy).toHaveBeenCalledWith({
			key: PLAUSIBLE_EVENT_EVENTS_KEYS.TYPE,
			value: 'send',
			action: PLAUSIBLE_EVENT_FILTER_ACTIONS.REMOVE
		});
	});
});
