import type {
	GetMyOrdersArgs,
	_SERVICE as OisyTradeService,
	UserOrder
} from '$declarations/oisy_trade/oisy_trade.did';
import { OisyTradeCanister } from '$lib/canisters/oisy-trade.canister';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { ActorSubclass } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import { mock } from 'vitest-mock-extended';

describe('oisy-trade.canister', () => {
	const createOisyTradeCanister = ({
		serviceOverride
	}: Pick<
		CreateCanisterOptions<OisyTradeService>,
		'serviceOverride'
	>): Promise<OisyTradeCanister> =>
		OisyTradeCanister.create({
			canisterId: Principal.fromText('aaaaa-aa'),
			identity: mockIdentity,
			certifiedServiceOverride: serviceOverride,
			serviceOverride
		});

	const service = mock<ActorSubclass<OisyTradeService>>();

	const args: GetMyOrdersArgs = { filter: { ByPage: { after: [], length: 100 } } };

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getMyOrders', () => {
		it('unwraps Ok into the orders list and forwards the args', async () => {
			const orders = [{ id: 'order-1' }] as unknown as UserOrder[];
			service.get_my_orders.mockResolvedValue({ Ok: orders });

			const { getMyOrders } = await createOisyTradeCanister({ serviceOverride: service });

			const res = await getMyOrders(args);

			expect(res).toEqual(orders);
			expect(service.get_my_orders).toHaveBeenCalledExactlyOnceWith([args]);
		});

		it('throws with the canister message when present', async () => {
			service.get_my_orders.mockResolvedValue({
				Err: { kind: { RequestError: [{ OrderNotFound: null }] }, message: ['Unknown order id'] }
			});

			const { getMyOrders } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(getMyOrders(args)).rejects.toThrow('Unknown order id');
		});

		it('falls back to the kind discriminant when there is no message', async () => {
			service.get_my_orders.mockResolvedValue({
				Err: { kind: { TemporaryError: [] }, message: [] }
			});

			const { getMyOrders } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(getMyOrders(args)).rejects.toThrow('TemporaryError');
		});
	});
});
