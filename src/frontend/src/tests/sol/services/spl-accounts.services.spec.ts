import { DEVNET_EURC_TOKEN } from '$env/tokens/tokens-spl/tokens.eurc.env';
import * as solanaApi from '$sol/api/solana.api';
import { loadSplTokenBalance } from '$sol/services/spl-accounts.services';
import { SolanaNetworks } from '$sol/types/network';
import * as solAddressUtils from '$sol/utils/sol-address.utils';
import { mockAtaAddress, mockAtaAddress2, mockSolAddress } from '$tests/mocks/sol.mock';
import * as solProgramToken from '@solana-program/token';
import { address, type ProgramDerivedAddressBump } from '@solana/kit';
import type { MockInstance } from 'vitest';

vi.mock('@solana-program/token', () => ({
	findAssociatedTokenPda: vi.fn()
}));

describe('spl-account.services', () => {
	describe('loadSplTokenBalance', () => {
		let spyIsAtaAddress: MockInstance;
		let spyCheckIfAccountExists: MockInstance;
		let spyLoadTokenBalance: MockInstance;
		let spyFindAssociatedTokenPda: MockInstance;

		const mockBalance = 123n;

		const mockParams = {
			address: mockAtaAddress,
			network: SolanaNetworks.mainnet,
			tokenAddress: DEVNET_EURC_TOKEN.address,
			tokenOwnerAddress: DEVNET_EURC_TOKEN.owner
		};

		beforeEach(() => {
			vi.clearAllMocks();
			vi.resetAllMocks();

			spyIsAtaAddress = vi.spyOn(solAddressUtils, 'isAtaAddress').mockResolvedValue(true);
			spyCheckIfAccountExists = vi.spyOn(solanaApi, 'checkIfAccountExists').mockResolvedValue(true);
			spyLoadTokenBalance = vi.spyOn(solanaApi, 'loadTokenBalance').mockResolvedValue(mockBalance);
			spyFindAssociatedTokenPda = vi
				.spyOn(solProgramToken, 'findAssociatedTokenPda')
				.mockResolvedValue([address(mockAtaAddress2), 0 as ProgramDerivedAddressBump]);
		});

		it('should load positive token balance successfully', async () => {
			const balance = await loadSplTokenBalance(mockParams);

			expect(balance).toEqual(mockBalance);

			expect(spyIsAtaAddress).toHaveBeenCalledOnce();
			expect(spyIsAtaAddress).toHaveBeenCalledWith({
				address: mockAtaAddress,
				network: SolanaNetworks.mainnet
			});
			expect(spyFindAssociatedTokenPda).not.toHaveBeenCalled();
			expect(spyCheckIfAccountExists).toHaveBeenCalledOnce();
			expect(spyCheckIfAccountExists).toHaveBeenCalledWith({
				address: mockAtaAddress,
				network: SolanaNetworks.mainnet
			});
			expect(spyLoadTokenBalance).toHaveBeenCalledOnce();
			expect(spyLoadTokenBalance).toHaveBeenCalledWith({
				ataAddress: mockAtaAddress,
				network: SolanaNetworks.mainnet
			});
		});

		it('should return zero when account does not exist', async () => {
			spyCheckIfAccountExists.mockResolvedValueOnce(false);

			const balance = await loadSplTokenBalance(mockParams);

			expect(balance).toEqual(0n);

			expect(spyLoadTokenBalance).not.toHaveBeenCalled();
		});

		it('should return zero when amount is nullish', async () => {
			spyLoadTokenBalance.mockResolvedValueOnce(undefined);

			const balance = await loadSplTokenBalance(mockParams);

			expect(balance).toEqual(0n);
		});

		it('should calculate the ATA address when the input address is not an ATA', async () => {
			spyIsAtaAddress.mockResolvedValueOnce(false);

			const balance = await loadSplTokenBalance({
				...mockParams,
				address: mockSolAddress
			});

			expect(balance).toEqual(mockBalance);

			expect(spyIsAtaAddress).toHaveBeenCalledOnce();
			expect(spyIsAtaAddress).toHaveBeenCalledWith({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet
			});
			expect(spyFindAssociatedTokenPda).toHaveBeenCalledOnce();
			expect(spyFindAssociatedTokenPda).toHaveBeenCalledWith({
				owner: mockSolAddress,
				tokenProgram: DEVNET_EURC_TOKEN.owner,
				mint: DEVNET_EURC_TOKEN.address
			});
			expect(spyCheckIfAccountExists).toHaveBeenCalledOnce();
			expect(spyCheckIfAccountExists).toHaveBeenCalledWith({
				address: mockAtaAddress2,
				network: SolanaNetworks.mainnet
			});
			expect(spyLoadTokenBalance).toHaveBeenCalledOnce();
			expect(spyLoadTokenBalance).toHaveBeenCalledWith({
				ataAddress: mockAtaAddress2,
				network: SolanaNetworks.mainnet
			});
		});
	});
});
