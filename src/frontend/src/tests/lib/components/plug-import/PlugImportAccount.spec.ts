import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { BTC_MAINNET_NETWORK } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import PlugImportAccount from '$lib/components/plug-import/PlugImportAccount.svelte';
import { ZERO } from '$lib/constants/app.constants';
import {
	PLUG_IMPORT_SEND_BUTTON,
	PLUG_IMPORT_SEND_DISABLED
} from '$lib/constants/test-ids.constants';
import type { PlugAccount, PlugBalance } from '$lib/types/plug';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { plugRowKey } from '$lib/utils/plug.utils';
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

		const nativeEth = {
			...mockValidToken,
			standard: { code: 'ethereum' },
			symbol: 'ETH',
			network: ETHEREUM_NETWORK
		} as unknown as typeof mockValidToken;

		const erc20 = {
			...mockValidToken,
			standard: { code: 'erc20' },
			symbol: 'USDT',
			network: ETHEREUM_NETWORK,
			address: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
		} as unknown as typeof mockValidToken;

		const nativeSol = {
			...mockValidToken,
			standard: { code: 'solana' },
			symbol: 'SOL',
			network: SOLANA_MAINNET_NETWORK
		} as unknown as typeof mockValidToken;

		const spl = {
			...mockValidToken,
			standard: { code: 'spl' },
			symbol: 'USD1',
			network: SOLANA_MAINNET_NETWORK,
			address: 'USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB'
		} as unknown as typeof mockValidToken;

		const sendButton = (row: PlugBalance) => `${PLUG_IMPORT_SEND_BUTTON}-${plugRowKey(row)}`;
		const disabledLabel = (row: PlugBalance) => `${PLUG_IMPORT_SEND_DISABLED}-${plugRowKey(row)}`;

		it('offers a send action for an IC balance above its fee', () => {
			const row = balance({ token: icrc, balance: 100_000n });

			const { getByTestId } = render(PlugImportAccount, {
				onsend: vi.fn(),
				account: mockAccount,
				balances: [row]
			});

			expect(getByTestId(sendButton(row))).toBeInTheDocument();
		});

		it('explains why an IC balance below its fee cannot be sent', () => {
			const row = balance({ token: icrc, balance: 5_000n });

			const { getByTestId, queryByTestId } = render(PlugImportAccount, {
				onsend: vi.fn(),
				account: mockAccount,
				balances: [row]
			});

			expect(queryByTestId(sendButton(row))).toBeNull();
			expect(getByTestId(disabledLabel(row))).toHaveTextContent(
				replacePlaceholders(en.plug_import.text.send_below_fee, { $symbol: 'ckUSDT' })
			);
		});

		it('explains that an unsupported chain must be sent from the original wallet', () => {
			// A chain-key address whose send path does not exist yet.
			const btc = {
				...mockValidToken,
				standard: { code: 'bitcoin' },
				symbol: 'BTC',
				network: BTC_MAINNET_NETWORK
			} as unknown as typeof mockValidToken;
			const row = balance({ token: btc, balance: 100_000n });

			const { getByTestId, queryByTestId } = render(PlugImportAccount, {
				onsend: vi.fn(),
				account: mockAccount,
				balances: [row]
			});

			expect(queryByTestId(sendButton(row))).toBeNull();
			expect(getByTestId(disabledLabel(row))).toHaveTextContent(
				en.plug_import.text.send_unsupported_chain
			);
		});

		it('offers no send action for a balance that could not be read', () => {
			const row = balance({ token: icrc, balance: undefined });

			const { queryByTestId } = render(PlugImportAccount, {
				onsend: vi.fn(),
				account: mockAccount,
				balances: [row]
			});

			expect(queryByTestId(sendButton(row))).toBeNull();
		});

		it('offers a send action for a native EVM balance', () => {
			const row = balance({ token: nativeEth, balance: 10n ** 16n });

			const { getByTestId } = render(PlugImportAccount, {
				onsend: vi.fn(),
				account: mockAccount,
				balances: [row]
			});

			expect(getByTestId(sendButton(row))).toBeInTheDocument();
		});

		it('offers a send action for an ERC20 when the account holds gas', () => {
			const nativeRow = balance({ token: nativeEth, balance: 10n ** 16n });
			const tokenRow = balance({ token: erc20, balance: 5_000_000n });

			const { getByTestId } = render(PlugImportAccount, {
				onsend: vi.fn(),
				account: mockAccount,
				balances: [nativeRow, tokenRow]
			});

			expect(getByTestId(sendButton(tokenRow))).toBeInTheDocument();
		});

		it('blocks an ERC20 with no native balance to pay gas, naming the coin needed', () => {
			const nativeRow = balance({ token: nativeEth, balance: ZERO });
			const tokenRow = balance({ token: erc20, balance: 5_000_000n });

			const { getByTestId, queryByTestId } = render(PlugImportAccount, {
				onsend: vi.fn(),
				account: mockAccount,
				balances: [nativeRow, tokenRow]
			});

			expect(queryByTestId(sendButton(tokenRow))).toBeNull();
			expect(getByTestId(disabledLabel(tokenRow))).toHaveTextContent(
				replacePlaceholders(en.plug_import.text.send_needs_gas, { $symbol: 'ETH' })
			);
		});

		it('distinguishes rows that share a symbol across networks', () => {
			const onBase = balance({
				token: { ...erc20, network: BASE_NETWORK } as unknown as typeof mockValidToken,
				balance: 1_000n
			});
			const onEthereum = balance({ token: erc20, balance: 2_000n });

			expect(plugRowKey(onBase)).not.toBe(plugRowKey(onEthereum));
		});

		it('offers a send action for a native SOL balance', () => {
			const row = balance({ token: nativeSol, balance: 10n ** 8n });

			const { getByTestId } = render(PlugImportAccount, {
				onsend: vi.fn(),
				account: mockAccount,
				balances: [row]
			});

			expect(getByTestId(sendButton(row))).toBeInTheDocument();
		});

		it('offers a send action for an SPL token when the account holds SOL', () => {
			const solRow = balance({ token: nativeSol, balance: 10n ** 8n });
			const tokenRow = balance({ token: spl, balance: 5_000_000n });

			const { getByTestId } = render(PlugImportAccount, {
				onsend: vi.fn(),
				account: mockAccount,
				balances: [solRow, tokenRow]
			});

			expect(getByTestId(sendButton(tokenRow))).toBeInTheDocument();
		});

		it('blocks an SPL token with no SOL for the fee, naming the coin needed', () => {
			const solRow = balance({ token: nativeSol, balance: ZERO });
			const tokenRow = balance({ token: spl, balance: 5_000_000n });

			const { getByTestId, queryByTestId } = render(PlugImportAccount, {
				onsend: vi.fn(),
				account: mockAccount,
				balances: [solRow, tokenRow]
			});

			expect(queryByTestId(sendButton(tokenRow))).toBeNull();
			expect(getByTestId(disabledLabel(tokenRow))).toHaveTextContent(
				replacePlaceholders(en.plug_import.text.send_needs_gas, { $symbol: 'SOL' })
			);
		});
	});
});
