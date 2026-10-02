import PlugImportAccount from '$lib/components/plug-import/PlugImportAccount.svelte';
import { ZERO } from '$lib/constants/app.constants';
import type { PlugAccount, PlugBalance } from '$lib/types/plug';
import en from '$tests/mocks/i18n.mock';
import { mockValidToken } from '$tests/mocks/tokens.mock';
import { render } from '@testing-library/svelte';

const mockAccount: PlugAccount = {
	index: 0,
	principal: 'zb3p7-rkico-haofj-x7utu-caljs-csbui-dhix7-ubqqq-x53wi-ltrso-fae',
	evmAddress: '0xab9aEB30eAE740497aADb1Ae0F347db548457ac4',
	btcAddress: 'bc1pwn0fe4xjvuvf6dx3saep25azwv74jyzksf5ggys28al4t8mg5j5qtdmdej',
	solAddress: 'EUxq91X9hA2s2qDDHKmS8bHjQ8GX2XMNkakgRiDgksx'
};

const balance = (overrides: Partial<PlugBalance> = {}): PlugBalance => ({
	token: mockValidToken,
	address: mockAccount.principal,
	balance: 100_000_000n,
	...overrides
});

describe('PlugImportAccount', () => {
	it('shows a loading state while balances are undefined', () => {
		const { getByText } = render(PlugImportAccount, {
			account: mockAccount,
			balances: undefined
		});

		expect(getByText(en.plug_import.text.balance_loading)).toBeInTheDocument();
	});

	it('renders a non-zero balance with its symbol', () => {
		const { getByText } = render(PlugImportAccount, {
			account: mockAccount,
			balances: [balance()]
		});

		expect(getByText(mockValidToken.symbol)).toBeInTheDocument();
	});

	it('hides zero balances, since only movable assets matter here', () => {
		const { getByText, queryByText } = render(PlugImportAccount, {
			account: mockAccount,
			balances: [balance({ balance: ZERO })]
		});

		expect(queryByText(mockValidToken.symbol)).toBeNull();
		expect(getByText(en.plug_import.text.empty_account)).toBeInTheDocument();
	});

	it('keeps a failed lookup visible and distinct from an empty account', () => {
		const { getByText, queryByText } = render(PlugImportAccount, {
			account: mockAccount,
			balances: [balance({ balance: undefined })]
		});

		expect(getByText(en.plug_import.text.balance_unavailable)).toBeInTheDocument();
		expect(queryByText(en.plug_import.text.empty_account)).toBeNull();
	});

	it('reports an account with no balances at all as empty', () => {
		const { getByText } = render(PlugImportAccount, {
			account: mockAccount,
			balances: []
		});

		expect(getByText(en.plug_import.text.empty_account)).toBeInTheDocument();
	});

	it('labels the account with a one-based index, matching how Plug numbers them', () => {
		const { getByText } = render(PlugImportAccount, {
			account: { ...mockAccount, index: 2 },
			balances: []
		});

		expect(getByText('Account 3')).toBeInTheDocument();
	});
});
