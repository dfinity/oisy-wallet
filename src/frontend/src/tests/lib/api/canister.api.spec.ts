import { CanisterApi } from '$lib/api/canister.api';
import { Ed25519KeyIdentity } from '@icp-sdk/core/identity';
import { Principal } from '@icp-sdk/core/principal';

describe('canister.api', () => {
	const identityA = Ed25519KeyIdentity.generate();
	const identityB = Ed25519KeyIdentity.generate();
	const mockCanisterId = 'aaaaa-aa';
	const mockCanisterPrincipal = Principal.fromText(mockCanisterId);

	let api: CanisterApi<{ id: string }>;

	beforeEach(() => {
		api = new CanisterApi();
	});

	it('should create a new canister instance on first call', async () => {
		const create = vi.fn().mockResolvedValue({ id: 'canister-a' });

		const result = await api.getCanister({
			identity: identityA,
			canisterId: mockCanisterId,
			create
		});

		expect(result).toEqual({ id: 'canister-a' });
		expect(create).toHaveBeenCalledOnce();
		expect(create).toHaveBeenCalledWith({
			identity: identityA,
			canisterId: mockCanisterPrincipal
		});
	});

	it('should return cached instance for the same principal', async () => {
		const create = vi.fn().mockResolvedValue({ id: 'canister-a' });

		const first = await api.getCanister({
			identity: identityA,
			canisterId: mockCanisterId,
			create
		});
		const second = await api.getCanister({
			identity: identityA,
			canisterId: mockCanisterId,
			create
		});

		expect(first).toBe(second);
		expect(create).toHaveBeenCalledOnce();
	});

	it('should create separate instances for different principals', async () => {
		const createA = vi.fn().mockResolvedValue({ id: 'canister-a' });
		const createB = vi.fn().mockResolvedValue({ id: 'canister-b' });

		const resultA = await api.getCanister({
			identity: identityA,
			canisterId: mockCanisterId,
			create: createA
		});
		const resultB = await api.getCanister({
			identity: identityB,
			canisterId: mockCanisterId,
			create: createB
		});

		expect(resultA).toEqual({ id: 'canister-a' });
		expect(resultB).toEqual({ id: 'canister-b' });
		expect(createA).toHaveBeenCalledOnce();
		expect(createB).toHaveBeenCalledOnce();
	});

	it('should not call create again after caching for a given principal', async () => {
		const create = vi.fn().mockResolvedValue({ id: 'canister-a' });

		await api.getCanister({ identity: identityA, canisterId: mockCanisterId, create });
		await api.getCanister({ identity: identityA, canisterId: mockCanisterId, create });
		await api.getCanister({ identity: identityA, canisterId: mockCanisterId, create });

		expect(create).toHaveBeenCalledOnce();
	});

	it('should call create only once for concurrent calls with the same principal', async () => {
		const create = vi.fn().mockResolvedValue({ id: 'canister-a' });

		const results = await Promise.all([
			api.getCanister({ identity: identityA, canisterId: mockCanisterId, create }),
			api.getCanister({ identity: identityA, canisterId: mockCanisterId, create }),
			api.getCanister({ identity: identityA, canisterId: mockCanisterId, create })
		]);

		expect(create).toHaveBeenCalledOnce();
		expect(results[1]).toBe(results[0]);
		expect(results[2]).toBe(results[0]);
	});
});
