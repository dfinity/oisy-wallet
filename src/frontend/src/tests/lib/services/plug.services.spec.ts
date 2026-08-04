import { BTC_MAINNET_NETWORK } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { infuraProviders } from '$eth/providers/infura.providers';
import { getBalanceQuery } from '$icp/api/bitcoin.api';
import { balance as icrcBalance } from '$icp/api/icrc-ledger.api';
import type { IcToken } from '$icp/types/ic-token';
import { loadPlugBalances } from '$lib/services/plug.services';
import type { PlugAccount } from '$lib/types/plug';
import type { Token } from '$lib/types/token';
import { loadSolLamportsBalance } from '$sol/api/solana.api';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockValidToken } from '$tests/mocks/tokens.mock';
import { lamports } from '@solana/kit';

vi.mock('$icp/api/icrc-ledger.api', () => ({ balance: vi.fn() }));
vi.mock('$icp/api/bitcoin.api', () => ({ getBalanceQuery: vi.fn() }));
vi.mock('$eth/providers/infura.providers', () => ({ infuraProviders: vi.fn() }));
vi.mock('$sol/api/solana.api', () => ({ loadSolLamportsBalance: vi.fn() }));

const mockAccount: PlugAccount = {
	index: 0,
	principal: 'zb3p7-rkico-haofj-x7utu-caljs-csbui-dhix7-ubqqq-x53wi-ltrso-fae',
	evmAddress: '0xab9aEB30eAE740497aADb1Ae0F347db548457ac4',
	btcAddress: 'bc1pwn0fe4xjvuvf6dx3saep25azwv74jyzksf5ggys28al4t8mg5j5qtdmdej',
	solAddress: 'EUxq91X9hA2s2qDDHKmS8bHjQ8GX2XMNkakgRiDgksx'
};

const icToken = { ...mockValidToken, ledgerCanisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai' } as IcToken;

const nativeToken = ({
	network,
	symbol
}: {
	network: Token['network'];
	symbol: string;
}): Token => ({
	...mockValidToken,
	network,
	symbol
});

describe('loadPlugBalances', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(icrcBalance).mockResolvedValue(1n);
		vi.mocked(getBalanceQuery).mockResolvedValue(2n);
		vi.mocked(loadSolLamportsBalance).mockResolvedValue(lamports(4n));
		vi.mocked(infuraProviders).mockReturnValue({
			balance: vi.fn().mockResolvedValue(3n)
		} as unknown as ReturnType<typeof infuraProviders>);
	});

	const call = ({
		icTokens = [],
		nativeTokens = []
	}: {
		icTokens?: IcToken[];
		nativeTokens?: Token[];
	}) =>
		loadPlugBalances({
			account: mockAccount,
			icTokens,
			nativeTokens,
			identity: mockIdentity
		});

	it('queries an IC token by the Plug principal', async () => {
		const results = await call({ icTokens: [icToken] });

		expect(results).toHaveLength(1);
		expect(results[0].address).toBe(mockAccount.principal);
		expect(results[0].balance).toBe(1n);
	});

	it('queries Bitcoin with the derived taproot address', async () => {
		const results = await call({
			nativeTokens: [nativeToken({ network: BTC_MAINNET_NETWORK, symbol: 'BTC' })]
		});

		expect(getBalanceQuery).toHaveBeenCalledWith(
			expect.objectContaining({ address: mockAccount.btcAddress })
		);
		expect(results[0].address).toBe(mockAccount.btcAddress);
		expect(results[0].balance).toBe(2n);
	});

	it('queries an EVM network with the derived EVM address', async () => {
		const results = await call({
			nativeTokens: [nativeToken({ network: ETHEREUM_NETWORK, symbol: 'ETH' })]
		});

		expect(results[0].address).toBe(mockAccount.evmAddress);
		expect(results[0].balance).toBe(3n);
	});

	it('queries Solana with the derived Solana address', async () => {
		const results = await call({
			nativeTokens: [nativeToken({ network: SOLANA_MAINNET_NETWORK, symbol: 'SOL' })]
		});

		expect(loadSolLamportsBalance).toHaveBeenCalledWith(
			expect.objectContaining({ address: mockAccount.solAddress })
		);
		expect(results[0].address).toBe(mockAccount.solAddress);
		expect(results[0].balance).toBe(4n);
	});

	it('drops a native token whose network the import does not cover', async () => {
		const results = await call({
			nativeTokens: [nativeToken({ network: ICP_NETWORK, symbol: 'ICP' })]
		});

		expect(results).toEqual([]);
	});

	it('degrades a failed lookup to an undefined balance instead of rejecting', async () => {
		vi.mocked(getBalanceQuery).mockRejectedValue(new Error('bitcoin canister unreachable'));

		const results = await call({
			nativeTokens: [nativeToken({ network: BTC_MAINNET_NETWORK, symbol: 'BTC' })]
		});

		expect(results[0].balance).toBeUndefined();
	});

	it('keeps the other chains when one of them fails', async () => {
		vi.mocked(loadSolLamportsBalance).mockRejectedValue(new Error('rpc down'));

		const results = await call({
			nativeTokens: [
				nativeToken({ network: BTC_MAINNET_NETWORK, symbol: 'BTC' }),
				nativeToken({ network: SOLANA_MAINNET_NETWORK, symbol: 'SOL' })
			]
		});

		expect(results.find(({ token }) => token.symbol === 'BTC')?.balance).toBe(2n);
		expect(results.find(({ token }) => token.symbol === 'SOL')?.balance).toBeUndefined();
	});

	it('degrades a failed IC lookup without dropping the row', async () => {
		vi.mocked(icrcBalance).mockRejectedValue(new Error('ledger unreachable'));

		const results = await call({ icTokens: [icToken] });

		expect(results).toHaveLength(1);
		expect(results[0].balance).toBeUndefined();
	});
});
