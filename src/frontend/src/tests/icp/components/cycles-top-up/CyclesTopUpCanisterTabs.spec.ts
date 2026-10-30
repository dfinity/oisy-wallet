import CyclesTopUpCanisterTabs from '$icp/components/cycles-top-up/CyclesTopUpCanisterTabs.svelte';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import {
	CYCLES_TOP_UP_CONTACT,
	CYCLES_TOP_UP_RECENT_CANISTER
} from '$lib/constants/test-ids.constants';
import { contactsStore } from '$lib/stores/contacts.store';
import type { ContactUi } from '$lib/types/contact';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { mockTcyclesToken } from '$tests/mocks/cycles-mint.mock';
import en from '$tests/mocks/i18n.mock';
import { mockPrincipalText } from '$tests/mocks/identity.mock';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render } from '@testing-library/svelte';

describe('CyclesTopUpCanisterTabs', () => {
	const canister = 'ywcsb-maaaa-aaaai-q6k7a-cai';
	const otherCanister = 'um5iw-rqaaa-aaaaq-qaaba-cai';

	const topUp: IcTransactionUi = {
		id: '1',
		type: 'burn',
		typeLabel: 'transaction.label.top_up',
		to: canister,
		value: 1_000_000_000_000n,
		timestamp: 1_700_000_000_000_000_000n,
		status: 'executed'
	};

	const contact = ({ name, addresses }: Pick<ContactUi, 'name' | 'addresses'>): ContactUi => ({
		id: BigInt(name.length),
		name,
		updateTimestampNs: 12n,
		addresses,
		image: undefined
	});

	const withTopUp = () =>
		icTransactionsStore.append({
			tokenId: mockTcyclesToken.id,
			transactions: [{ data: topUp, certified: true }]
		});

	const renderTabs = (onSelect = vi.fn()) =>
		render(CyclesTopUpCanisterTabs, { props: { token: mockTcyclesToken, onSelect } });

	const click = async (row: HTMLElement) => {
		const button = row.querySelector('button');

		assertNonNullish(button);

		await fireEvent.click(button);
	};

	beforeEach(() => {
		icTransactionsStore.reset(mockTcyclesToken.id);
		contactsStore.set([]);
	});

	it('opens on Recently topped up, and each tab says what it will list when empty', async () => {
		const { container, getByText } = renderTabs();

		expect(container).toHaveTextContent(en.cycles_top_up.text.recently_topped_up_empty_state_title);

		await fireEvent.click(getByText(en.send.text.contacts_tab));

		expect(container).toHaveTextContent(en.cycles_top_up.text.contacts_empty_state_title);
	});

	it('lists the topped-up canisters, named after the contact that holds one, and picks one', async () => {
		withTopUp();
		contactsStore.set([
			contact({ name: 'Backend', addresses: [{ addressType: 'Icrcv2', address: canister }] })
		]);

		const onSelect = vi.fn();

		const { container, getByTestId } = renderTabs(onSelect);

		expect(container).toHaveTextContent('Backend');

		await click(getByTestId(CYCLES_TOP_UP_RECENT_CANISTER));

		expect(onSelect).toHaveBeenCalledExactlyOnceWith(canister);
	});

	it('shows a topped-up canister no contact holds by its ID', () => {
		withTopUp();

		const { container } = renderTabs();

		expect(container).toHaveTextContent(shortenWithMiddleEllipsis({ text: canister }));
	});

	it('opens on Contacts when nothing was topped up but a contact holds a canister ID, and picks one', async () => {
		contactsStore.set([
			contact({ name: 'Ledger', addresses: [{ addressType: 'Icrcv2', address: otherCanister }] })
		]);

		const onSelect = vi.fn();

		const { getByTestId, queryByTestId } = renderTabs(onSelect);

		expect(queryByTestId(CYCLES_TOP_UP_RECENT_CANISTER)).toBeNull();

		await click(getByTestId(CYCLES_TOP_UP_CONTACT));

		expect(onSelect).toHaveBeenCalledExactlyOnceWith(otherCanister);
	});

	it('stays on Recently topped up when both tabs have entries', () => {
		withTopUp();
		contactsStore.set([
			contact({ name: 'Ledger', addresses: [{ addressType: 'Icrcv2', address: otherCanister }] })
		]);

		const { getByTestId, queryByTestId } = renderTabs();

		expect(getByTestId(CYCLES_TOP_UP_RECENT_CANISTER)).toBeInTheDocument();
		expect(queryByTestId(CYCLES_TOP_UP_CONTACT)).toBeNull();
	});

	it('lists only the contact addresses that are canister IDs, one row each', () => {
		contactsStore.set([
			contact({
				name: 'Team',
				addresses: [
					{ addressType: 'Icrcv2', address: canister },
					{ addressType: 'Icrcv2', address: otherCanister },
					{ addressType: 'Icrcv2', address: mockPrincipalText }
				]
			})
		]);

		const { getAllByTestId, container } = renderTabs();

		expect(getAllByTestId(CYCLES_TOP_UP_CONTACT)).toHaveLength(2);
		expect(container).not.toHaveTextContent(shortenWithMiddleEllipsis({ text: mockPrincipalText }));
	});
});
