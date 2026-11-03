import type {
	_SERVICE as CmcService,
	IcpXdrConversionRateResponse,
	NotifyMintCyclesSuccess
} from '$declarations/cmc/cmc.did';
import { CMC_CANISTER_ID } from '$env/networks/networks.icp.env';
import { CmcCanister } from '$icp/canisters/cmc.canister';
import { CmcNotifyProcessingError, CmcNotifyRefundedError } from '$icp/canisters/cmc.errors';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { ActorSubclass } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import { mock } from 'vitest-mock-extended';

describe('cmc.canister', () => {
	const service = mock<ActorSubclass<CmcService>>();
	const certifiedService = mock<ActorSubclass<CmcService>>();

	const createCmcCanister = (): Promise<CmcCanister> =>
		CmcCanister.create({
			canisterId: Principal.fromText(CMC_CANISTER_ID),
			identity: mockIdentity,
			serviceOverride: service,
			certifiedServiceOverride: certifiedService
		});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getIcpXdrConversionRate', () => {
		const response: IcpXdrConversionRateResponse = {
			data: { xdr_permyriad_per_icp: 25_000n, timestamp_seconds: 1_790_000_000n },
			hash_tree: new Uint8Array(),
			certificate: new Uint8Array()
		};

		it('should return the rate in XDR permyriad per ICP, as a query', async () => {
			service.get_icp_xdr_conversion_rate.mockResolvedValue(response);

			const { getIcpXdrConversionRate } = await createCmcCanister();

			await expect(getIcpXdrConversionRate({ certified: false })).resolves.toBe(25_000n);
			expect(service.get_icp_xdr_conversion_rate).toHaveBeenCalledOnce();
			expect(certifiedService.get_icp_xdr_conversion_rate).not.toHaveBeenCalled();
		});

		it('should ask the certified service when certified', async () => {
			certifiedService.get_icp_xdr_conversion_rate.mockResolvedValue(response);

			const { getIcpXdrConversionRate } = await createCmcCanister();

			await expect(getIcpXdrConversionRate({ certified: true })).resolves.toBe(25_000n);
			expect(certifiedService.get_icp_xdr_conversion_rate).toHaveBeenCalledOnce();
			expect(service.get_icp_xdr_conversion_rate).not.toHaveBeenCalled();
		});
	});

	describe('notifyMintCycles', () => {
		const success: NotifyMintCyclesSuccess = {
			block_index: 7n,
			minted: 2_500_000_000_000n,
			balance: 2_499_900_000_000n
		};

		it('should notify the block for the default account, as an update, and return the mint', async () => {
			certifiedService.notify_mint_cycles.mockResolvedValue({ Ok: success });

			const { notifyMintCycles } = await createCmcCanister();

			await expect(notifyMintCycles({ blockIndex: 123n })).resolves.toEqual(success);
			expect(certifiedService.notify_mint_cycles).toHaveBeenCalledExactlyOnceWith({
				block_index: 123n,
				to_subaccount: [],
				deposit_memo: []
			});
			expect(service.notify_mint_cycles).not.toHaveBeenCalled();
		});

		it('should throw the mapped error when the CMC answers Processing', async () => {
			certifiedService.notify_mint_cycles.mockResolvedValue({ Err: { Processing: null } });

			const { notifyMintCycles } = await createCmcCanister();

			await expect(notifyMintCycles({ blockIndex: 123n })).rejects.toBeInstanceOf(
				CmcNotifyProcessingError
			);
		});

		it('should throw the mapped error when the CMC refunds', async () => {
			certifiedService.notify_mint_cycles.mockResolvedValue({
				Err: { Refunded: { block_index: [124n], reason: 'refunded' } }
			});

			const { notifyMintCycles } = await createCmcCanister();

			await expect(notifyMintCycles({ blockIndex: 123n })).rejects.toBeInstanceOf(
				CmcNotifyRefundedError
			);
		});
	});
});
