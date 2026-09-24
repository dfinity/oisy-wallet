import type { NotifyMintCyclesSuccess } from '$declarations/cmc/cmc.did';
import { CMC_CANISTER_ID } from '$env/networks/networks.icp.env';
import { getIcpXdrConversionRate, notifyMintCycles } from '$icp/api/cmc.api';
import { CmcCanister } from '$icp/canisters/cmc.canister';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { Principal } from '@icp-sdk/core/principal';
import { mock } from 'vitest-mock-extended';

describe('cmc.api', () => {
	const cmcCanisterMock = mock<CmcCanister>();

	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(CmcCanister, 'create').mockResolvedValue(cmcCanisterMock);
	});

	describe('getIcpXdrConversionRate', () => {
		it('should read the rate from the CMC', async () => {
			cmcCanisterMock.getIcpXdrConversionRate.mockResolvedValue(25_000n);

			await expect(
				getIcpXdrConversionRate({ identity: mockIdentity, certified: true })
			).resolves.toBe(25_000n);
			expect(cmcCanisterMock.getIcpXdrConversionRate).toHaveBeenCalledExactlyOnceWith({
				certified: true
			});
			expect(CmcCanister.create).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				canisterId: Principal.fromText(CMC_CANISTER_ID)
			});
		});

		it('should throw if identity is undefined', async () => {
			await expect(
				getIcpXdrConversionRate({ identity: undefined, certified: true })
			).rejects.toThrow();
		});
	});

	describe('notifyMintCycles', () => {
		const success: NotifyMintCyclesSuccess = {
			block_index: 7n,
			minted: 2_500_000_000_000n,
			balance: 2_499_900_000_000n
		};

		it('should notify the CMC of the block', async () => {
			cmcCanisterMock.notifyMintCycles.mockResolvedValue(success);

			await expect(notifyMintCycles({ identity: mockIdentity, blockIndex: 123n })).resolves.toEqual(
				success
			);
			expect(cmcCanisterMock.notifyMintCycles).toHaveBeenCalledExactlyOnceWith({
				blockIndex: 123n
			});
		});

		it('should build a client for every call, so a notify always runs as the current identity', async () => {
			cmcCanisterMock.notifyMintCycles.mockResolvedValue(success);

			await notifyMintCycles({ identity: mockIdentity, blockIndex: 1n });
			await notifyMintCycles({ identity: mockIdentity, blockIndex: 2n });

			expect(CmcCanister.create).toHaveBeenCalledTimes(2);
		});

		it('should throw if identity is undefined', async () => {
			await expect(notifyMintCycles({ identity: undefined, blockIndex: 123n })).rejects.toThrow();
		});
	});
});
