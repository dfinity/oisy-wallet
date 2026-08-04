import PlugImportAccount from '$lib/components/plug-import/PlugImportAccount.svelte';
import { ZERO } from '$lib/constants/app.constants';
import {
	PLUG_IMPORT_SEND_BUTTON,
	PLUG_IMPORT_SEND_DISABLED
} from '$lib/constants/test-ids.constants';
import type { PlugAccount, PlugBalance } from '$lib/types/plug';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
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
			onsend: vi.fn(),
			account: mockAccount,
			balances: undefined
		});

		expect(getByText(en.plug_import.text.balance_loading)).toBeInTheDocument();
	});

	it('renders a non-zero balance with its symbol', () => {
		const { getByText } = render(PlugImportAccount, {
			onsend: vi.fn(),
			account: mockAccount,
			balances: [balance()]
		});

		expect(getByText(mockValidToken.symbol)).toBeInTheDocument();
	});

	it('hides zero balances, since only movable assets matter here', () => {
		const { getByText, queryByText } = render(PlugImportAccount, {
			onsend: vi.fn(),
			account: mockAccount,
			balances: [balance({ balance: ZERO })]
		});

		expect(queryByText(mockValidToken.symbol)).toBeNull();
		expect(getByText(en.plug_import.text.empty_account)).toBeInTheDocument();
	});

	it('keeps a failed lookup visible and distinct from an empty account', () => {
		const { getByText, queryByText } = render(PlugImportAccount, {
			onsend: vi.fn(),
			account: mockAccount,
			balances: [balance({ balance: undefined })]
		});

		expect(getByText(en.plug_import.text.balance_unavailable)).toBeInTheDocument();
		expect(queryByText(en.plug_import.text.empty_account)).toBeNull();
	});

	it('reports an account with no balances at all as empty', () => {
		const { getByText } = render(PlugImportAccount, {
			onsend: vi.fn(),
			account: mockAccount,
			balances: []
		});

		expect(getByText(en.plug_import.text.empty_account)).toBeInTheDocument();
	});

	it('labels the account with a one-based index, matching how Plug numbers them', () => {
		const { getByText } = render(PlugImportAccount, {
			onsend: vi.fn(),
			account: { ...mockAccount, index: 2 },
			balances: []
		});

		expect(getByText('Account 3')).toBeInTheDocument();
	});

	describe('sending', () => {
		const icrc = {
			...mockValidToken,
			standard: { code: 'icrc' },
			symbol: 'ckUSDT',
			fee: 10_000n
		} as unknown as typeof mockValidToken;

		it('offers a send action for an IC balance above its fee', () => {
			const { getByTestId } = render(PlugImportAccount, {
				onsend: vi.fn(),
				account: mockAccount,
				balances: [balance({ token: icrc, balance: 100_000n })]
			});

			expect(getByTestId(`${PLUG_IMPORT_SEND_BUTTON}-ckUSDT`)).toBeInTheDocument();
		});

		it('explains why an IC balance below its fee cannot be sent', () => {
			const { getByTestId, queryByTestId } = render(PlugImportAccount, {
				onsend: vi.fn(),
				account: mockAccount,
				balances: [balance({ token: icrc, balance: 5_000n })]
			});

			expect(queryByTestId(`${PLUG_IMPORT_SEND_BUTTON}-ckUSDT`)).toBeNull();
			expect(getByTestId(`${PLUG_IMPORT_SEND_DISABLED}-ckUSDT`)).toHaveTextContent(
				replacePlaceholders(en.plug_import.text.send_below_fee, { $symbol: 'ckUSDT' })
			);
		});

		it('explains that a non-IC balance must be sent from the original wallet', () => {
			// A chain-key address on another chain: OISY can show it but cannot sign for it.
			const btc = {
				...mockValidToken,
				standard: { code: 'bitcoin' },
				symbol: 'BTC'
			} as unknown as typeof mockValidToken;

			const { getByTestId, queryByTestId } = render(PlugImportAccount, {
				onsend: vi.fn(),
				account: mockAccount,
				balances: [balance({ token: btc, balance: 100_000n })]
			});

			expect(queryByTestId(`${PLUG_IMPORT_SEND_BUTTON}-BTC`)).toBeNull();
			expect(getByTestId(`${PLUG_IMPORT_SEND_DISABLED}-BTC`)).toHaveTextContent(
				en.plug_import.text.send_only_ic
			);
		});

		it('offers no send action for a balance that could not be read', () => {
			const { queryByTestId } = render(PlugImportAccount, {
				onsend: vi.fn(),
				account: mockAccount,
				balances: [balance({ token: icrc, balance: undefined })]
			});

			expect(queryByTestId(`${PLUG_IMPORT_SEND_BUTTON}-ckUSDT`)).toBeNull();
		});
	});
});
