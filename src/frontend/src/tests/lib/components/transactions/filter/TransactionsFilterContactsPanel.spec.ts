import TransactionsFilterContactsPanel from '$lib/components/transactions/filter/TransactionsFilterContactsPanel.svelte';
import * as contactsDerived from '$lib/derived/contacts.derived';
import { i18n } from '$lib/stores/i18n.store';
import { transactionsFilterStore } from '$lib/stores/transactions-filter.store';
import type { ContactUi } from '$lib/types/contact';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { getMockContactsUi, mockContactEthAddressUi } from '$tests/mocks/contacts.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { get } from 'svelte/store';

const mockAllContacts = (contacts: ContactUi[]) => {
	vi.spyOn(contactsDerived.allContacts, 'subscribe').mockImplementation((fn) => {
		fn(contacts);
		return () => {};
	});
};

describe('TransactionsFilterContactsPanel', () => {
	const [contactAlice] = getMockContactsUi({
		n: 1,
		name: 'Alice',
		addresses: [mockContactEthAddressUi]
	});
	const [contactBob] = getMockContactsUi({
		n: 1,
		name: 'Bob',
		addresses: []
	});
	// getMockContactsUi seeds id with the index, so re-stamp to make ids distinct
	const alice: ContactUi = { ...contactAlice, id: 1n, name: 'Alice' };
	const bob: ContactUi = { ...contactBob, id: 2n, name: 'Bob' };

	beforeEach(() => {
		vi.restoreAllMocks();
		localStorage.clear();
		transactionsFilterStore.clear();
		mockAllContacts([bob, alice]);
	});

	it('renders one row per contact, alphabetically sorted by name', () => {
		const { container } = render(TransactionsFilterContactsPanel);

		const names = Array.from(container.querySelectorAll('li span.text-sm')).map(
			(el) => el.textContent?.trim() ?? ''
		);

		expect(names).toEqual(['Alice', 'Bob']);
	});

	it('reflects the store as the checked state', () => {
		transactionsFilterStore.toggleContactId('1');

		const { container } = render(TransactionsFilterContactsPanel);

		const aliceInput = container.querySelector<HTMLInputElement>(
			'input[id="transactions-filter-contact-1"]'
		);
		const bobInput = container.querySelector<HTMLInputElement>(
			'input[id="transactions-filter-contact-2"]'
		);

		expect(aliceInput?.checked).toBeTruthy();
		expect(bobInput?.checked).toBeFalsy();
	});

	it('toggles the corresponding contact id in the store when a checkbox changes', async () => {
		const { container } = render(TransactionsFilterContactsPanel);

		const input = container.querySelector<HTMLInputElement>(
			'input[id="transactions-filter-contact-1"]'
		);

		expect(input).not.toBeNull();

		await fireEvent.click(input as HTMLInputElement);

		expect(get(transactionsFilterStore).contactIds).toEqual(['1']);
	});

	it('filters the list by contact name using the search input', async () => {
		const { container, getByPlaceholderText } = render(TransactionsFilterContactsPanel);

		const search = getByPlaceholderText(get(i18n).transaction.filter.search_contacts_placeholder);
		await fireEvent.input(search, { target: { value: 'ali' } });

		const names = Array.from(container.querySelectorAll('li span.text-sm')).map(
			(el) => el.textContent?.trim() ?? ''
		);

		expect(names).toEqual(['Alice']);
	});

	it('finds a contact by one of its addresses via the search input', async () => {
		const { container, getByPlaceholderText } = render(TransactionsFilterContactsPanel);

		const search = getByPlaceholderText(get(i18n).transaction.filter.search_contacts_placeholder);
		await fireEvent.input(search, { target: { value: mockContactEthAddressUi.address } });

		const names = Array.from(container.querySelectorAll('li span.text-sm')).map(
			(el) => el.textContent?.trim() ?? ''
		);

		expect(names).toEqual(['Alice']);
	});

	it('caps the visible list to 50 rows when over the limit and renders the showing-partial hint', () => {
		const contacts: ContactUi[] = Array.from({ length: 60 }, (_, i) => ({
			id: BigInt(i + 1),
			name: `Contact ${i.toString().padStart(3, '0')}`,
			updateTimestampNs: BigInt(0),
			image: undefined,
			addresses: []
		}));
		mockAllContacts(contacts);

		const { container, getByText } = render(TransactionsFilterContactsPanel);

		expect(container.querySelectorAll('li')).toHaveLength(50);

		const hint = replacePlaceholders(get(i18n).transaction.filter.showing_partial, {
			$shown: '50',
			$total: '60'
		});

		expect(getByText(hint)).toBeInTheDocument();
	});
});
