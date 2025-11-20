import type {
	_SERVICE as ExtV2TokenService,
	Transaction
} from '$declarations/ext_v2_token/declarations/ext_v2_token.did';
import { ExtV2TokenCanister } from '$icp/canisters/ext-v2-token.canister';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { bn1Bi, bn2Bi } from '$tests/mocks/balances.mock';
import {
	mockAccountIdentifierText,
	mockAccountIdentifierText2,
	mockIdentity
} from '$tests/mocks/identity.mock';
import type { ActorSubclass } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import { mock } from 'vitest-mock-extended';

describe('ext-v2-token.canister', () => {
	const certified = false;

	const createExtV2TokenCanister = ({
		serviceOverride
	}: Pick<
		CreateCanisterOptions<ExtV2TokenService>,
		'serviceOverride'
	>): Promise<ExtV2TokenCanister> =>
		ExtV2TokenCanister.create({
			canisterId: Principal.fromText('oeee4-qaaaa-aaaak-qaaeq-cai'),
			identity: mockIdentity,
			certifiedServiceOverride: serviceOverride,
			serviceOverride
		});

	const service = mock<ActorSubclass<ExtV2TokenService>>();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('transactions', () => {
		const mockParams = { certified };

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should correctly call the transactions method', async () => {
			const mockTransactions: Transaction[] = [
				{
					token: 1,
					time: 123_456n,
					seller: mockAccountIdentifierText,
					buyer: mockAccountIdentifierText2,
					price: bn1Bi
				},
				{
					token: 2,
					time: 123_789n,
					seller: mockAccountIdentifierText2,
					buyer: mockAccountIdentifierText,
					price: bn2Bi
				}
			];
			service.transactions.mockResolvedValue(mockTransactions);

			const { transactions } = await createExtV2TokenCanister({
				serviceOverride: service
			});

			const res = await transactions(mockParams);

			expect(res).toEqual(mockTransactions);
			expect(service.transactions).toHaveBeenCalledExactlyOnceWith();
		});

		it('should handle an empty array as response', async () => {
			const mockTransactions: Transaction[] = [];
			service.transactions.mockResolvedValue(mockTransactions);

			const { transactions } = await createExtV2TokenCanister({
				serviceOverride: service
			});

			const res = await transactions(mockParams);

			expect(res).toEqual(mockTransactions);
			expect(service.transactions).toHaveBeenCalledExactlyOnceWith();
		});

		it('should throw an error if transactions throws', async () => {
			const mockError = new Error('Test response error');
			service.transactions.mockRejectedValue(mockError);

			const { transactions } = await createExtV2TokenCanister({
				serviceOverride: service
			});

			const res = transactions(mockParams);

			await expect(res).rejects.toThrow(mockError);
		});
	});
});
