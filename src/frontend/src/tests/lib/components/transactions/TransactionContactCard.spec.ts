import { fireEvent, render } from '@testing-library/svelte';
import { get } from 'svelte/store';

import TransactionContactCard from '$lib/components/transactions/TransactionContactCard.svelte';
import { TOKEN_SKELETON_TEXT } from '$lib/constants/test-ids.constants';
import { contacts as contactsDerived } from '$lib/derived/contacts.derived';
import { i18n } from '$lib/stores/i18n.store';
import { modalStore } from '$lib/stores/modal.store';
import type { ContactUi } from '$lib/types/contact';
import { getMockContactsUi } from '$tests/mocks/contacts.mock';

vi.spyOn(modalStore, 'openAddressBook').mockImplementation(vi.fn());

const mockContacts = (contacts: ContactUi[]) => {
	vi.spyOn(contactsDerived, 'subscribe').mockImplementation((fn) => {
		fn(contacts);
		return () => {};
	});
};

const [toMockContact] = getMockContactsUi({
	n: 1,
	addresses: [{ address: '0xTO', label: 'Alice alias', addressType: 'Eth' }],
	name: 'Alice'
});
const [fromMockContact] = getMockContactsUi({
	n: 1,
	addresses: [{ address: '0xFROM', label: 'Bob alias', addressType: 'Eth' }],
	name: 'Bob'
});
const [forMockContact] = getMockContactsUi({
	n: 1,
	addresses: [{ address: '0xSPENDER', label: 'Charlie alias', addressType: 'Eth' }],
	name: 'Charlie'
});

describe('TransactionContactCard', () => {
	const toAddress = '0xTO';
	const fromAddress = '0xFROM';
	const spenderAddress = '0xSPENDER';
	const toExplorer = 'https://explorer.io/to';
	const fromExplorer = 'https://explorer.io/from';
	const spenderExplorer = 'https://explorer.io/spender';

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders SkeletonAddressCard if no relevant address', () => {
		const { getByTestId } = render(TransactionContactCard, {
			props: { type: 'send' }
		});

		expect(getByTestId(TOKEN_SKELETON_TEXT)).toBeInTheDocument();
	});

	it('renders send case with "to" label', () => {
		const { getByText } = render(TransactionContactCard, {
			props: { type: 'send', to: toAddress, toExplorerUrl: toExplorer }
		});

		expect(getByText(`${get(i18n).transaction.text.to}:`, { exact: false })).toBeTruthy();
		expect(getByText(toAddress)).toBeTruthy();
	});

	it('renders receive case with "from" label', () => {
		mockContacts([fromMockContact]);
		const { getByText } = render(TransactionContactCard, {
			props: { type: 'receive', from: fromAddress, fromExplorerUrl: fromExplorer }
		});

		expect(getByText(`${get(i18n).transaction.text.from}:`, { exact: false })).toBeTruthy();
		expect(getByText(fromAddress)).toBeTruthy();
	});

	it('renders approve case with "for" label', () => {
		const { getByText } = render(TransactionContactCard, {
			props: {
				type: 'approve',
				approveSpender: spenderAddress,
				approveSpenderExplorerUrl: spenderExplorer
			}
		});

		expect(getByText(`${get(i18n).transaction.text.for}:`, { exact: false })).toBeTruthy();
		expect(getByText(spenderAddress)).toBeTruthy();
	});

	it('shows save address button if no contact found', async () => {
		const { getByRole } = render(TransactionContactCard, {
			props: { type: 'send', to: toAddress }
		});

		const btn = getByRole('button', { name: get(i18n).address.save.title });

		expect(btn).toBeTruthy();

		await fireEvent.click(btn);

		expect(modalStore.openAddressBook).toHaveBeenCalled();
	});

	it('renders contact name if contact found (to)', () => {
		mockContacts([toMockContact]);

		const { queryByText } = render(TransactionContactCard, {
			props: { type: 'send', to: toAddress }
		});

		expect(queryByText(/Alice/)).toBeTruthy();
		expect(queryByText(/Bob/)).toBeFalsy();
		expect(queryByText(/Charlie/)).toBeFalsy();
	});

	it('renders contact name if contact found (from)', () => {
		mockContacts([fromMockContact]);

		const { queryByText } = render(TransactionContactCard, {
			props: { type: 'receive', from: fromAddress }
		});

		expect(queryByText(/Alice/)).toBeFalsy();
		expect(queryByText(/Bob/)).toBeTruthy();
		expect(queryByText(/Charlie/)).toBeFalsy();
	});

	it('renders contact name if contact found (for)', () => {
		mockContacts([forMockContact]);

		const { queryByText } = render(TransactionContactCard, {
			props: { type: 'approve', approveSpender: spenderAddress }
		});

		expect(queryByText(/Alice/)).toBeFalsy();
		expect(queryByText(/Bob/)).toBeFalsy();
		expect(queryByText(/Charlie/)).toBeTruthy();
	});

	it('renders AddressActions with correct props (send)', () => {
		const { getByLabelText } = render(TransactionContactCard, {
			props: { type: 'send', to: toAddress, toExplorerUrl: toExplorer }
		});

		const btn = getByLabelText(get(i18n).transaction.alt.open_to_block_explorer);

		expect(btn).toBeTruthy();
	});

	it('renders AddressActions with correct props (receive)', () => {
		const { getByLabelText } = render(TransactionContactCard, {
			props: { type: 'receive', from: fromAddress, fromExplorerUrl: fromExplorer }
		});

		const btn = getByLabelText(get(i18n).transaction.alt.open_from_block_explorer);

		expect(btn).toBeTruthy();
	});

	it('renders AddressActions with correct props (approve)', () => {
		const { getByLabelText } = render(TransactionContactCard, {
			props: {
				type: 'approve',
				approveSpender: spenderAddress,
				approveSpenderExplorerUrl: spenderExplorer
			}
		});

		const btn = getByLabelText(get(i18n).transaction.alt.open_for_block_explorer);

		expect(btn).toBeTruthy();
	});
});
