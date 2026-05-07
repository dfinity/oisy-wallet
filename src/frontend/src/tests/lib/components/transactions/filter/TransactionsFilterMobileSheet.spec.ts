import TransactionsFilterMobileSheet from '$lib/components/transactions/filter/TransactionsFilterMobileSheet.svelte';
import * as allTokensDerived from '$lib/derived/all-tokens.derived';
import * as contactsDerived from '$lib/derived/contacts.derived';
import { i18n } from '$lib/stores/i18n.store';
import { transactionsFilterStore } from '$lib/stores/transactions-filter.store';
import { fireEvent, render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('TransactionsFilterMobileSheet', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		localStorage.clear();
		transactionsFilterStore.clear();

		vi.spyOn(allTokensDerived.allFungibleTokens, 'subscribe').mockImplementation((fn) => {
			fn([]);
			return () => {};
		});
		vi.spyOn(contactsDerived.allContacts, 'subscribe').mockImplementation((fn) => {
			fn([]);
			return () => {};
		});
	});

	it('does not render the sheet content when not visible', () => {
		const { queryByText } = render(TransactionsFilterMobileSheet, { props: { visible: false } });

		expect(queryByText(get(i18n).transaction.filter.sheet_title)).not.toBeInTheDocument();
	});

	it('renders the root step with three category rows when visible', () => {
		const { getByText } = render(TransactionsFilterMobileSheet, { props: { visible: true } });

		expect(getByText(get(i18n).transaction.filter.sheet_title)).toBeInTheDocument();
		expect(getByText(get(i18n).transaction.filter.types_label)).toBeInTheDocument();
		expect(getByText(get(i18n).transaction.filter.tokens_label)).toBeInTheDocument();
		expect(getByText(get(i18n).transaction.filter.contacts_label)).toBeInTheDocument();
	});

	it('does not render the clear-filters button at root when no filter is active', () => {
		const { queryByText } = render(TransactionsFilterMobileSheet, { props: { visible: true } });

		expect(queryByText(get(i18n).transaction.filter.clear)).not.toBeInTheDocument();
	});

	it('renders the clear-filters button at root when at least one filter is active', () => {
		transactionsFilterStore.toggleType('send');

		const { getByText } = render(TransactionsFilterMobileSheet, { props: { visible: true } });

		expect(getByText(get(i18n).transaction.filter.clear)).toBeInTheDocument();
	});

	it('renders a count badge next to a category that has selections', () => {
		transactionsFilterStore.toggleType('send');
		transactionsFilterStore.toggleType('receive');

		const { getByText } = render(TransactionsFilterMobileSheet, { props: { visible: true } });

		expect(getByText('2')).toBeInTheDocument();
	});

	it('navigates to the types panel when the types row is clicked', async () => {
		const { getByText, container } = render(TransactionsFilterMobileSheet, {
			props: { visible: true }
		});

		await fireEvent.click(getByText(get(i18n).transaction.filter.types_label));

		expect(container.querySelector('input[id="transactions-filter-type-send"]')).not.toBeNull();
	});

	it('navigates back to the root step when the back button is clicked', async () => {
		const { getByText, getByLabelText, container } = render(TransactionsFilterMobileSheet, {
			props: { visible: true }
		});

		await fireEvent.click(getByText(get(i18n).transaction.filter.types_label));

		expect(container.querySelector('input[id="transactions-filter-type-send"]')).not.toBeNull();

		await fireEvent.click(getByLabelText(get(i18n).core.text.back));

		expect(container.querySelector('input[id="transactions-filter-type-send"]')).toBeNull();
		expect(getByText(get(i18n).transaction.filter.tokens_label)).toBeInTheDocument();
		expect(getByText(get(i18n).transaction.filter.contacts_label)).toBeInTheDocument();
	});

	it('resets to the root step when the sheet is closed', async () => {
		const { getByText, getByRole, queryByPlaceholderText, rerender } = render(
			TransactionsFilterMobileSheet,
			{ props: { visible: true } }
		);

		await fireEvent.click(getByText(get(i18n).transaction.filter.tokens_label));

		expect(
			queryByPlaceholderText(get(i18n).transaction.filter.search_tokens_placeholder)
		).not.toBeNull();

		await fireEvent.click(getByRole('button', { name: get(i18n).core.alt.close_details }));

		await rerender({ visible: true });

		expect(
			queryByPlaceholderText(get(i18n).transaction.filter.search_tokens_placeholder)
		).toBeNull();
		expect(getByText(get(i18n).transaction.filter.sheet_title)).toBeInTheDocument();
	});
});
