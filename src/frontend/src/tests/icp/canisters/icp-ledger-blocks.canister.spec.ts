import type {
	Block,
	_SERVICE as IcpLedgerService,
	QueryBlocksResponse
} from '$declarations/icp_ledger/icp_ledger.did';
import { ICP_LEDGER_CANISTER_ID } from '$env/networks/networks.icp.env';
import { IcpLedgerBlocksCanister } from '$icp/canisters/icp-ledger-blocks.canister';
import { ZERO } from '$lib/constants/app.constants';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { ActorSubclass } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import { mock } from 'vitest-mock-extended';

describe('icp-ledger-blocks.canister', () => {
	const service = mock<ActorSubclass<IcpLedgerService>>();
	const certifiedService = mock<ActorSubclass<IcpLedgerService>>();

	const createIcpLedgerBlocksCanister = (): Promise<IcpLedgerBlocksCanister> =>
		IcpLedgerBlocksCanister.create({
			canisterId: Principal.fromText(ICP_LEDGER_CANISTER_ID),
			identity: mockIdentity,
			serviceOverride: service,
			certifiedServiceOverride: certifiedService
		});

	const block: Block = {
		parent_hash: [],
		transaction: {
			memo: ZERO,
			icrc1_memo: [],
			operation: [],
			created_at_time: { timestamp_nanos: ZERO }
		},
		timestamp: { timestamp_nanos: 1_790_000_000_000_000_000n }
	};

	const response = (overrides: Partial<QueryBlocksResponse> = {}): QueryBlocksResponse => ({
		chain_length: 1_000n,
		certificate: [],
		blocks: [block],
		first_block_index: 42n,
		archived_blocks: [],
		...overrides
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('blockTimestamp', () => {
		it('should read that one block, as a query', async () => {
			service.query_blocks.mockResolvedValue(response());

			const { blockTimestamp } = await createIcpLedgerBlocksCanister();

			await expect(blockTimestamp({ index: 42n, certified: false })).resolves.toBe(
				1_790_000_000_000_000_000n
			);
			expect(service.query_blocks).toHaveBeenCalledExactlyOnceWith({ start: 42n, length: 1n });
			expect(certifiedService.query_blocks).not.toHaveBeenCalled();
		});

		it('should ask the certified service when certified', async () => {
			certifiedService.query_blocks.mockResolvedValue(response());

			const { blockTimestamp } = await createIcpLedgerBlocksCanister();

			await expect(blockTimestamp({ index: 42n, certified: true })).resolves.toBe(
				1_790_000_000_000_000_000n
			);
			expect(certifiedService.query_blocks).toHaveBeenCalledOnce();
			expect(service.query_blocks).not.toHaveBeenCalled();
		});

		// The block's time is then only in the archive canister.
		it('should return undefined for an archived block', async () => {
			service.query_blocks.mockResolvedValue(
				response({
					blocks: [],
					first_block_index: 900n,
					archived_blocks: [
						{
							start: 42n,
							length: 1n,
							callback: [Principal.fromText(ICP_LEDGER_CANISTER_ID), 'get_blocks']
						}
					]
				})
			);

			const { blockTimestamp } = await createIcpLedgerBlocksCanister();

			await expect(blockTimestamp({ index: 42n, certified: false })).resolves.toBeUndefined();
		});

		it('should return undefined for a block beyond the chain', async () => {
			service.query_blocks.mockResolvedValue(response({ blocks: [], first_block_index: 42n }));

			const { blockTimestamp } = await createIcpLedgerBlocksCanister();

			await expect(blockTimestamp({ index: 42n, certified: false })).resolves.toBeUndefined();
		});

		// Never another block's time for this one's.
		it('should return undefined when the block that came back is another one', async () => {
			service.query_blocks.mockResolvedValue(response({ first_block_index: 43n }));

			const { blockTimestamp } = await createIcpLedgerBlocksCanister();

			await expect(blockTimestamp({ index: 42n, certified: false })).resolves.toBeUndefined();
		});
	});
});
