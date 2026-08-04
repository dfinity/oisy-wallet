import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { BTC_MAINNET_NETWORK } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { infuraErc20Providers } from '$eth/providers/infura-erc20.providers';
import { infuraProviders } from '$eth/providers/infura.providers';
import { getBalanceQuery } from '$icp/api/bitcoin.api';
import { balance as icrcBalance } from '$icp/api/icrc-ledger.api';
import { loadPlugBalances } from '$lib/services/plug.services';
import type { PlugAccount } from '$lib/types/plug';
import type { Token } from '$lib/types/token';
import { loadSolLamportsBalance } from '$sol/api/solana.api';
import { loadSplTokenBalance } from '$sol/services/spl-accounts.services';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockValidToken } from '$tests/mocks/tokens.mock';
import { lamports } from '@solana/kit';

vi.mock('$icp/api/icrc-ledger.api', () => ({ balance: vi.fn() }));
vi.mock('$icp/api/bitcoin.api', () => ({ getBalanceQuery: vi.fn() }));
vi.mock('$eth/providers/infura.providers', () => ({ infuraProviders: vi.fn() }));
vi.mock('$eth/providers/infura-erc20.providers', () => ({ infuraErc20Providers: vi.fn() }));
vi.mock('$sol/api/solana.api', () => ({ loadSolLamportsBalance: vi.fn() }));
vi.mock('$sol/services/spl-accounts.services', () => ({ loadSplTokenBalance: vi.fn() }));

const mockAccount: PlugAccount = {
	index: 0,
	principal: 'zb3p7-rkico-haofj-x7utu-caljs-csbui-dhix7-ubqqq-x53wi-ltrso-fae',
	evmAddress: '0xab9aEB30eAE740497aADb1Ae0F347db548457ac4',
	btcAddress: 'bc1pwn0fe4xjvuvf6dx3saep25azwv74jyzksf5ggys28al4t8mg5j5qtdmdej',
	solAddress: 'EUxq91X9hA2s2qDDHKmS8bHjQ8GX2XMNkakgRiDgksx'
};

const asToken = (overrides: Record<string, unknown>): Token =>
	({ ...mockValidToken, ...overrides }) as Token;

const icpToken = asToken({ standard: { code: 'icp' }, symbol: 'ICP', network: ICP_NETWORK });

const icrcToken = asToken({
	standard: { code: 'icrc' },
	symbol: 'ckUSDT',
	network: ICP_NETWORK,
	ledgerCanisterId: 'cngnf-vqaaa-aaaar-qag4q-cai'
});

// XTC's ledger is DIP20 and exposes no icrc1_balance_of, so it must not be queried.
const dip20Token = asToken({
	standard: { code: 'dip20' },
	symbol: 'XTC',
	network: ICP_NETWORK,
	ledgerCanisterId: 'aanaa-xaaaa-aaaah-aaeiq-cai'
});

const erc20Token = asToken({
	standard: { code: 'erc20' },
	symbol: 'USDC',
	network: BASE_NETWORK,
	address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
});

const splToken = asToken({
	standard: { code: 'spl' },
	symbol: 'USD1',
	network: SOLANA_MAINNET_NETWORK,
	address: 'USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB',
	owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
});

const nativeBtc = asToken({
	standard: { code: 'bitcoin' },
	symbol: 'BTC',
	network: BTC_MAINNET_NETWORK
});

const nativeEth = asToken({
	standard: { code: 'ethereum' },
	symbol: 'ETH',
	network: ETHEREUM_NETWORK
});

const nativeSol = asToken({
	standard: { code: 'solana' },
	symbol: 'SOL',
	network: SOLANA_MAINNET_NETWORK
});

describe('loadPlugBalances', () => {
	const erc20Balance = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(icrcBalance).mockResolvedValue(1n);
		vi.mocked(getBalanceQuery).mockResolvedValue(2n);
		vi.mocked(loadSolLamportsBalance).mockResolvedValue(lamports(4n));
		vi.mocked(loadSplTokenBalance).mockResolvedValue(5n);
		vi.mocked(infuraProviders).mockReturnValue({
			balance: vi.fn().mockResolvedValue(3n)
		} as unknown as ReturnType<typeof infuraProviders>);

		erc20Balance.mockResolvedValue(6n);
		vi.mocked(infuraErc20Providers).mockReturnValue({
			balance: erc20Balance
		} as unknown as ReturnType<typeof infuraErc20Providers>);
	});

	const call = (tokens: Token[]) =>
		loadPlugBalances({ account: mockAccount, tokens, identity: mockIdentity });

	describe('IC tokens', () => {
		it('queries ICP by the derived principal', async () => {
			const results = await call([icpToken]);

			expect(results[0].address).toBe(mockAccount.principal);
			expect(results[0].balance).toBe(1n);
		});

		it('queries an ICRC token by the derived principal', async () => {
			const results = await call([icrcToken]);

			expect(icrcBalance).toHaveBeenCalledOnce();
			expect(results[0].balance).toBe(1n);
		});

		it('never queries a DIP20 ledger, which has no icrc1_balance_of', async () => {
			const results = await call([dip20Token]);

			expect(results).toEqual([]);
			expect(icrcBalance).not.toHaveBeenCalled();
		});
	});

	describe('token standards on other chains', () => {
		it('queries an ERC20 by contract against the derived EVM address', async () => {
			const results = await call([erc20Token]);

			expect(erc20Balance).toHaveBeenCalledExactlyOnceWith({
				contract: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
				address: mockAccount.evmAddress
			});
			expect(results[0].address).toBe(mockAccount.evmAddress);
			expect(results[0].balance).toBe(6n);
		});

		it('queries an SPL token against the derived Solana address', async () => {
			const results = await call([splToken]);

			expect(loadSplTokenBalance).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					address: mockAccount.solAddress,
					tokenAddress: 'USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB',
					tokenOwnerAddress: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
				})
			);
			expect(results[0].balance).toBe(5n);
		});

		it('does not use the native loader for an ERC20, despite the shared network', async () => {
			await call([erc20Token]);

			expect(infuraProviders).not.toHaveBeenCalled();
		});

		it('does not use the native loader for an SPL token', async () => {
			await call([splToken]);

			expect(loadSolLamportsBalance).not.toHaveBeenCalled();
		});
	});

	describe('native coins', () => {
		it('queries Bitcoin with the derived taproot address', async () => {
			const results = await call([nativeBtc]);

			expect(getBalanceQuery).toHaveBeenCalledWith(
				expect.objectContaining({ address: mockAccount.btcAddress })
			);
			expect(results[0].balance).toBe(2n);
		});

		it('queries an EVM network with the derived EVM address', async () => {
			const results = await call([nativeEth]);

			expect(results[0].address).toBe(mockAccount.evmAddress);
			expect(results[0].balance).toBe(3n);
		});

		it('queries Solana with the derived Solana address', async () => {
			const results = await call([nativeSol]);

			expect(results[0].address).toBe(mockAccount.solAddress);
			expect(results[0].balance).toBe(4n);
		});
	});

	describe('degradation', () => {
		it('degrades a failed lookup to an undefined balance instead of rejecting', async () => {
			vi.mocked(getBalanceQuery).mockRejectedValue(new Error('bitcoin canister unreachable'));

			const results = await call([nativeBtc]);

			expect(results[0].balance).toBeUndefined();
		});

		it('keeps the other chains when one of them fails', async () => {
			vi.mocked(loadSolLamportsBalance).mockRejectedValue(new Error('rpc down'));

			const results = await call([nativeBtc, nativeSol]);

			expect(results.find(({ token: { symbol } }) => symbol === 'BTC')?.balance).toBe(2n);
			expect(results.find(({ token: { symbol } }) => symbol === 'SOL')?.balance).toBeUndefined();
		});

		it('degrades an uninstalled ICRC ledger without dropping the row', async () => {
			vi.mocked(icrcBalance).mockRejectedValue(new Error('canister contains no Wasm module'));

			const results = await call([icrcToken]);

			expect(results).toHaveLength(1);
			expect(results[0].balance).toBeUndefined();
		});
	});

	it('resolves every supported standard in one pass, skipping only the unsupported one', async () => {
		const results = await call([
			icpToken,
			icrcToken,
			dip20Token,
			erc20Token,
			splToken,
			nativeBtc,
			nativeEth,
			nativeSol
		]);

		expect(results.map(({ token: { symbol } }) => symbol)).toEqual([
			'ICP',
			'ckUSDT',
			'USDC',
			'USD1',
			'BTC',
			'ETH',
			'SOL'
		]);
	});
});
