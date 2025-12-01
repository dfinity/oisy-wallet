import type { _SERVICE as GldtStakeService } from '$declarations/gldt_stake/gldt_stake.did';
import { GldtStakeCanister } from '$icp/canisters/gldt_stake.canister';
import { CanisterInternalError } from '$lib/canisters/errors';
import { ZERO } from '$lib/constants/app.constants';
import type { CreateCanisterOptions } from '$lib/types/canister';
import {
	configMockResponse,
	dailyAnalyticsMockResponse,
	stakePositionMockResponse
} from '$tests/mocks/gldt_stake.mock';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import { toNullable } from '@dfinity/utils';
import type { ActorSubclass } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import { mock } from 'vitest-mock-extended';

describe('gldt_stake.canister', () => {
	const createGldtStakeCanister = ({
		serviceOverride
	}: Pick<CreateCanisterOptions<GldtStakeService>, 'serviceOverride'>) =>
		GldtStakeCanister.create({
			canisterId: Principal.fromText('sqpxs-piaaa-aaaaj-qneva-cai'),
			identity: mockIdentity,
			serviceOverride,
			certifiedServiceOverride: serviceOverride
		});

	const service = mock<ActorSubclass<GldtStakeService>>();
	const mockResponseError = new Error('gldt_stake error');

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getApyOverall', () => {
		it('returns APY number successfully', async () => {
			const response = 10;

			service.get_apy_overall.mockResolvedValue(response);

			const { getApyOverall } = await createGldtStakeCanister({ serviceOverride: service });

			const result = await getApyOverall();

			expect(result).toEqual(response);
			expect(service.get_apy_overall).toHaveBeenCalledOnce();
		});

		it('throws an error if get_apy_overall method fails', async () => {
			service.get_apy_overall.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { getApyOverall } = await createGldtStakeCanister({
				serviceOverride: service
			});

			const res = getApyOverall();

			await expect(res).rejects.toThrow(mockResponseError);
		});
	});

	describe('getDailyAnalytics', () => {
		it('returns daily statistics successfully', async () => {
			service.get_daily_analytics.mockResolvedValue([[1000n, dailyAnalyticsMockResponse]]);

			const { getDailyAnalytics } = await createGldtStakeCanister({ serviceOverride: service });

			const result = await getDailyAnalytics();

			expect(result).toEqual(dailyAnalyticsMockResponse);
			expect(service.get_daily_analytics).toHaveBeenCalledExactlyOnceWith({
				starting_day: ZERO,
				limit: toNullable(1n)
			});
		});

		it('throws an error if get_daily_analytics method fails', async () => {
			service.get_daily_analytics.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { getDailyAnalytics } = await createGldtStakeCanister({
				serviceOverride: service
			});

			const res = getDailyAnalytics();

			await expect(res).rejects.toThrow(mockResponseError);
		});
	});

	describe('manageStakePosition', () => {
		const params = { AddStake: { amount: 1n } };

		it('manages stake position successfully', async () => {
			service.manage_stake_position.mockResolvedValue({ Ok: stakePositionMockResponse });

			const { manageStakePosition } = await createGldtStakeCanister({ serviceOverride: service });

			const result = await manageStakePosition(params);

			expect(result).toEqual(stakePositionMockResponse);
			expect(service.manage_stake_position).toHaveBeenCalledWith(params);
		});

		it('throws an error if manage_stake_position method fails', async () => {
			service.manage_stake_position.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { manageStakePosition } = await createGldtStakeCanister({
				serviceOverride: service
			});

			const res = manageStakePosition(params);

			await expect(res).rejects.toThrow(mockResponseError);
		});

		it('should throw an error if manage_stake_position returns an AddStakeError error', async () => {
			const canisterErrorMessage = 'error';
			service.manage_stake_position.mockResolvedValue({
				Err: { AddStakeError: { TransferError: canisterErrorMessage } }
			});

			const { manageStakePosition } = await createGldtStakeCanister({
				serviceOverride: service
			});

			const res = manageStakePosition(params);

			await expect(res).rejects.toThrow(new CanisterInternalError(canisterErrorMessage));
		});
	});

	describe('getPosition', () => {
		const params = { principal: mockPrincipal };

		it('returns a position successfully', async () => {
			const response = toNullable(stakePositionMockResponse);

			service.get_position.mockResolvedValue(response);

			const { getPosition } = await createGldtStakeCanister({ serviceOverride: service });

			const result = await getPosition({ principal: mockPrincipal });

			expect(result).toEqual(stakePositionMockResponse);
			expect(service.get_position).toHaveBeenCalledExactlyOnceWith(mockPrincipal);
		});

		it('throws an error if get_position method fails', async () => {
			service.get_position.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { getPosition } = await createGldtStakeCanister({
				serviceOverride: service
			});

			const res = getPosition(params);

			await expect(res).rejects.toThrow(mockResponseError);
		});
	});

	describe('getConfig', () => {
		it('returns config successfully', async () => {
			service.get_config.mockResolvedValue(configMockResponse);

			const { getConfig } = await createGldtStakeCanister({ serviceOverride: service });

			const result = await getConfig();

			expect(result).toEqual(configMockResponse);
			expect(service.get_config).toHaveBeenCalledOnce();
		});

		it('throws an error if get_config method fails', async () => {
			service.get_config.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { getConfig } = await createGldtStakeCanister({
				serviceOverride: service
			});

			const res = getConfig();

			await expect(res).rejects.toThrow(mockResponseError);
		});
	});
});
