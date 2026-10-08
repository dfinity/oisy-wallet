import { USDC_TOKEN } from '$env/tokens/tokens-spl/tokens.usdc.env';
import { ZERO } from '$lib/constants/app.constants';
import * as solanaApi from '$sol/api/solana.api';
import {
	SOLANA_MAX_MULTIPLE_ACCOUNTS,
	SYSTEM_PROGRAM_ADDRESS,
	TOKEN_2022_PROGRAM_ADDRESS,
	TOKEN_PROGRAM_ADDRESS
} from '$sol/constants/sol.constants';
import { loadSolNetworkBalances } from '$sol/services/sol-balances.services';
import type { SolAddress } from '$sol/types/address';
import { SolanaNetworks } from '$sol/types/network';
import type { SolanaParsedAccountInfo } from '$sol/types/sol-rpc';
import type { SplToken } from '$sol/types/spl';
import { mockSolAddress, mockSplAddress } from '$tests/mocks/sol.mock';
import { findAssociatedTokenPda } from '@solana-program/token';
import {
	address,
	getAddressDecoder,
	getAddressEncoder,
	lamports,
	type Base64EncodedBytes,
	type ProgramDerivedAddressBump
} from '@solana/kit';
import type { MockInstance } from 'vitest';

vi.mock('@solana-program/token', () => ({
	findAssociatedTokenPda: vi.fn()
}));

describe('sol-balances.services', () => {
	describe('loadSolNetworkBalances', () => {
		const network = SolanaNetworks.mainnet;

		// Any 32 bytes are a valid address, so flipping the first byte gives each mint a distinct,
		// predictable stand-in for its ATA without deriving a real PDA.
		const ataOf = (mint: SolAddress): SolAddress =>
			getAddressDecoder().decode(
				new Uint8Array(getAddressEncoder().encode(address(mint))).map((byte, index) =>
					index === 0 ? 255 - byte : byte
				)
			);

		const mintAt = (index: number): SolAddress =>
			getAddressDecoder().decode(new Uint8Array(32).fill(index + 1));

		const walletAccount = (balance: bigint): NonNullable<SolanaParsedAccountInfo> => ({
			executable: false,
			lamports: lamports(balance),
			owner: address(SYSTEM_PROGRAM_ADDRESS),
			space: ZERO,
			data: ['' as Base64EncodedBytes, 'base64']
		});

		const tokenAccount = ({
			mint,
			amount,
			program = TOKEN_PROGRAM_ADDRESS,
			authority = mockSolAddress
		}: {
			mint: SolAddress;
			amount: bigint;
			program?: SolAddress;
			authority?: SolAddress;
		}): NonNullable<SolanaParsedAccountInfo> => ({
			executable: false,
			lamports: lamports(2_039_280n),
			owner: address(program),
			space: 165n,
			data: {
				program: program === TOKEN_2022_PROGRAM_ADDRESS ? 'spl-token-2022' : 'spl-token',
				space: 165n,
				parsed: {
					type: 'account',
					info: {
						mint,
						owner: authority,
						tokenAmount: { amount: `${amount}`, decimals: 6 }
					}
				}
			}
		});

		const usdc: Pick<SplToken, 'address' | 'owner'> = {
			address: USDC_TOKEN.address,
			owner: TOKEN_PROGRAM_ADDRESS
		};

		const token2022: Pick<SplToken, 'address' | 'owner'> = {
			address: mockSplAddress,
			owner: TOKEN_2022_PROGRAM_ADDRESS
		};

		let accounts: Map<SolAddress, SolanaParsedAccountInfo>;
		let spyGetMultipleAccountsInfo: MockInstance<typeof solanaApi.getMultipleAccountsInfo>;

		beforeEach(() => {
			vi.clearAllMocks();

			accounts = new Map();

			vi.mocked(findAssociatedTokenPda).mockImplementation(({ mint }) =>
				Promise.resolve([address(ataOf(mint)), 0 as ProgramDerivedAddressBump])
			);

			spyGetMultipleAccountsInfo = vi
				.spyOn(solanaApi, 'getMultipleAccountsInfo')
				.mockImplementation(({ addresses }) =>
					Promise.resolve(addresses.map((address) => accounts.get(address) ?? null))
				);
		});

		it('should read SOL from the wallet lamports and each SPL balance from its ATA', async () => {
			accounts.set(mockSolAddress, walletAccount(1_500_000_000n));
			accounts.set(ataOf(usdc.address), tokenAccount({ mint: usdc.address, amount: 42_000_000n }));
			accounts.set(
				ataOf(token2022.address),
				tokenAccount({ mint: token2022.address, amount: 7n, program: TOKEN_2022_PROGRAM_ADDRESS })
			);

			await expect(
				loadSolNetworkBalances({ address: mockSolAddress, network, tokens: [usdc, token2022] })
			).resolves.toStrictEqual({
				sol: 1_500_000_000n,
				spl: { [usdc.address]: 42_000_000n, [token2022.address]: 7n }
			});

			expect(spyGetMultipleAccountsInfo).toHaveBeenCalledExactlyOnceWith({
				addresses: [mockSolAddress, ataOf(usdc.address), ataOf(token2022.address)],
				network
			});
		});

		it('should derive each ATA with the token program of the token, Token-2022 included', async () => {
			await loadSolNetworkBalances({ address: mockSolAddress, network, tokens: [usdc, token2022] });

			expect(findAssociatedTokenPda).toHaveBeenCalledTimes(2);
			expect(findAssociatedTokenPda).toHaveBeenNthCalledWith(1, {
				owner: mockSolAddress,
				mint: usdc.address,
				tokenProgram: TOKEN_PROGRAM_ADDRESS
			});
			expect(findAssociatedTokenPda).toHaveBeenNthCalledWith(2, {
				owner: mockSolAddress,
				mint: token2022.address,
				tokenProgram: TOKEN_2022_PROGRAM_ADDRESS
			});
		});

		it('should return zero for a token whose ATA does not exist', async () => {
			accounts.set(mockSolAddress, walletAccount(1n));

			const { spl } = await loadSolNetworkBalances({
				address: mockSolAddress,
				network,
				tokens: [usdc]
			});

			expect(spl).toStrictEqual({ [usdc.address]: ZERO });
		});

		it('should return zero SOL for a wallet account that does not exist', async () => {
			accounts.set(ataOf(usdc.address), tokenAccount({ mint: usdc.address, amount: 5n }));

			await expect(
				loadSolNetworkBalances({ address: mockSolAddress, network, tokens: [usdc] })
			).resolves.toStrictEqual({ sol: ZERO, spl: { [usdc.address]: 5n } });
		});

		it('should leave out a token whose ATA is not a parsed token account', async () => {
			accounts.set(mockSolAddress, walletAccount(1n));
			accounts.set(ataOf(usdc.address), walletAccount(10n));

			const { spl } = await loadSolNetworkBalances({
				address: mockSolAddress,
				network,
				tokens: [usdc]
			});

			expect(spl).toStrictEqual({});
		});

		it('should leave out a token whose ATA holds another mint', async () => {
			accounts.set(mockSolAddress, walletAccount(1n));
			accounts.set(ataOf(usdc.address), tokenAccount({ mint: mockSplAddress, amount: 10n }));

			const { spl } = await loadSolNetworkBalances({
				address: mockSolAddress,
				network,
				tokens: [usdc]
			});

			expect(spl).toStrictEqual({});
		});

		it('should leave out a token whose ATA belongs to another token program', async () => {
			accounts.set(mockSolAddress, walletAccount(1n));
			accounts.set(
				ataOf(usdc.address),
				tokenAccount({ mint: usdc.address, amount: 10n, program: TOKEN_2022_PROGRAM_ADDRESS })
			);

			const { spl } = await loadSolNetworkBalances({
				address: mockSolAddress,
				network,
				tokens: [usdc]
			});

			expect(spl).toStrictEqual({});
		});

		it('should return zero for a token whose ATA was handed to another authority', async () => {
			accounts.set(mockSolAddress, walletAccount(1n));
			accounts.set(
				ataOf(usdc.address),
				tokenAccount({ mint: usdc.address, amount: 10n, authority: mockSplAddress })
			);

			const { spl } = await loadSolNetworkBalances({
				address: mockSolAddress,
				network,
				tokens: [usdc]
			});

			expect(spl).toStrictEqual({ [usdc.address]: ZERO });
		});

		it('should load only the wallet when there are no tokens', async () => {
			accounts.set(mockSolAddress, walletAccount(3n));

			await expect(
				loadSolNetworkBalances({ address: mockSolAddress, network, tokens: [] })
			).resolves.toStrictEqual({ sol: 3n, spl: {} });

			expect(spyGetMultipleAccountsInfo).toHaveBeenCalledExactlyOnceWith({
				addresses: [mockSolAddress],
				network
			});
		});

		it('should split the accounts into chunks of at most 100 and map every balance back', async () => {
			const tokens = Array.from({ length: 150 }, (_, index) => ({
				address: mintAt(index),
				owner: TOKEN_PROGRAM_ADDRESS
			}));

			accounts.set(mockSolAddress, walletAccount(9n));
			tokens.forEach(({ address: mint }, index) =>
				accounts.set(ataOf(mint), tokenAccount({ mint, amount: BigInt(index + 1) }))
			);

			const { sol, spl } = await loadSolNetworkBalances({
				address: mockSolAddress,
				network,
				tokens
			});

			expect(spyGetMultipleAccountsInfo).toHaveBeenCalledTimes(2);

			const [[{ addresses: first }], [{ addresses: second }]] =
				spyGetMultipleAccountsInfo.mock.calls;

			expect(first).toHaveLength(SOLANA_MAX_MULTIPLE_ACCOUNTS);
			expect(first[0]).toBe(mockSolAddress);
			expect(second).toHaveLength(tokens.length + 1 - SOLANA_MAX_MULTIPLE_ACCOUNTS);

			expect(sol).toBe(9n);
			expect(Object.keys(spl)).toHaveLength(tokens.length);

			tokens.forEach(({ address: mint }, index) => expect(spl[mint]).toBe(BigInt(index + 1)));
		});

		it('should reject when one RPC call fails', async () => {
			const tokens = Array.from({ length: 150 }, (_, index) => ({
				address: mintAt(index),
				owner: TOKEN_PROGRAM_ADDRESS
			}));

			spyGetMultipleAccountsInfo
				.mockResolvedValueOnce([])
				.mockRejectedValueOnce(new Error('RPC unavailable'));

			await expect(
				loadSolNetworkBalances({ address: mockSolAddress, network, tokens })
			).rejects.toThrow('RPC unavailable');
		});
	});
});
