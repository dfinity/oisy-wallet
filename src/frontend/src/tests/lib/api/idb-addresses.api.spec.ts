import {
	clearIdbBtcAddressMainnet,
	clearIdbEthAddress,
	clearIdbSolAddressMainnet,
	deleteIdbBtcAddressMainnet,
	deleteIdbEthAddress,
	deleteIdbSolAddressMainnet,
	getIdbBtcAddressMainnet,
	getIdbEthAddress,
	getIdbSolAddressMainnet,
	setIdbBtcAddressMainnet,
	setIdbEthAddress,
	setIdbSolAddressMainnet,
	updateIdbBtcAddressMainnetLastUsage,
	updateIdbEthAddressLastUsage,
	updateIdbSolAddressMainnetLastUsage
} from '$lib/api/idb-addresses.api';
import { mockPrincipal } from '$tests/mocks/identity.mock';
import * as idbKeyval from 'idb-keyval';

vi.mock('$app/environment', () => ({
	browser: true
}));

describe('idb-addresses.api', () => {
	const mockAddress = {
		address: '0x123',
		lastUsedTimestamp: Date.now(),
		createdAtTimestamp: Date.now()
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('BTC operations', () => {
		it('should set BTC address', async () => {
			await setIdbBtcAddressMainnet({
				principal: mockPrincipal,
				address: mockAddress
			});

			expect(idbKeyval.set).toHaveBeenCalledWith(
				mockPrincipal.toText(),
				mockAddress,
				expect.any(Object)
			);
		});

		it('should get BTC address', async () => {
			vi.mocked(idbKeyval.get).mockResolvedValue(mockAddress);

			const result = await getIdbBtcAddressMainnet(mockPrincipal);

			expect(result).toEqual(mockAddress);
			expect(idbKeyval.get).toHaveBeenCalledWith(mockPrincipal.toText(), expect.any(Object));
		});

		it('should delete BTC address', async () => {
			await deleteIdbBtcAddressMainnet(mockPrincipal);

			expect(idbKeyval.del).toHaveBeenCalledWith(mockPrincipal.toText(), expect.any(Object));
		});

		it('should update BTC address last usage', async () => {
			// eslint-disable-next-line local-rules/prefer-object-params
			vi.mocked(idbKeyval.update).mockImplementation((_, updater) => {
				const updated = updater(mockAddress) as typeof mockAddress;

				expect(updated.lastUsedTimestamp).toBeGreaterThan(mockAddress.lastUsedTimestamp);

				return Promise.resolve();
			});

			await updateIdbBtcAddressMainnetLastUsage(mockPrincipal);

			expect(idbKeyval.update).toHaveBeenCalled();
		});
	});

	describe('ETH operations', () => {
		it('should set ETH address', async () => {
			await setIdbEthAddress({
				principal: mockPrincipal,
				address: mockAddress
			});

			expect(idbKeyval.set).toHaveBeenCalledWith(
				mockPrincipal.toText(),
				mockAddress,
				expect.any(Object)
			);
		});

		it('should get ETH address', async () => {
			vi.mocked(idbKeyval.get).mockResolvedValue(mockAddress);

			const result = await getIdbEthAddress(mockPrincipal);

			expect(result).toEqual(mockAddress);
			expect(idbKeyval.get).toHaveBeenCalledWith(mockPrincipal.toText(), expect.any(Object));
		});

		it('should delete ETH address', async () => {
			await deleteIdbEthAddress(mockPrincipal);

			expect(idbKeyval.del).toHaveBeenCalledWith(mockPrincipal.toText(), expect.any(Object));
		});

		it('should update ETH address last usage', async () => {
			// eslint-disable-next-line local-rules/prefer-object-params
			vi.mocked(idbKeyval.update).mockImplementation((_, updater) => {
				const updated = updater(mockAddress) as typeof mockAddress;

				expect(updated.lastUsedTimestamp).toBeGreaterThan(mockAddress.lastUsedTimestamp);

				return Promise.resolve();
			});

			await updateIdbEthAddressLastUsage(mockPrincipal);

			expect(idbKeyval.update).toHaveBeenCalled();
		});
	});

	describe('SOL operations', () => {
		it('should set SOL address', async () => {
			await setIdbSolAddressMainnet({
				principal: mockPrincipal,
				address: mockAddress
			});

			expect(idbKeyval.set).toHaveBeenCalledWith(
				mockPrincipal.toText(),
				mockAddress,
				expect.any(Object)
			);
		});

		it('should get SOL address', async () => {
			vi.mocked(idbKeyval.get).mockResolvedValue(mockAddress);

			const result = await getIdbSolAddressMainnet(mockPrincipal);

			expect(result).toEqual(mockAddress);
			expect(idbKeyval.get).toHaveBeenCalledWith(mockPrincipal.toText(), expect.any(Object));
		});

		it('should delete SOL address', async () => {
			await deleteIdbSolAddressMainnet(mockPrincipal);

			expect(idbKeyval.del).toHaveBeenCalledWith(mockPrincipal.toText(), expect.any(Object));
		});

		it('should update SOL address last usage', async () => {
			// eslint-disable-next-line local-rules/prefer-object-params
			vi.mocked(idbKeyval.update).mockImplementation((_, updater) => {
				const updated = updater(mockAddress) as typeof mockAddress;

				expect(updated.lastUsedTimestamp).toBeGreaterThan(mockAddress.lastUsedTimestamp);

				return Promise.resolve();
			});

			await updateIdbSolAddressMainnetLastUsage(mockPrincipal);

			expect(idbKeyval.update).toHaveBeenCalled();
		});
	});

	describe('clearIdbBtcAddressMainnet', () => {
		it('should clear BTC addresses', async () => {
			await clearIdbBtcAddressMainnet();

			expect(idbKeyval.clear).toHaveBeenCalledExactlyOnceWith(expect.any(Object));
		});
	});

	describe('clearIdbEthAddress', () => {
		it('should clear ETH addresses', async () => {
			await clearIdbEthAddress();

			expect(idbKeyval.clear).toHaveBeenCalledExactlyOnceWith(expect.any(Object));
		});
	});

	describe('clearIdbSolAddressMainnet', () => {
		it('should clear SOL addresses', async () => {
			await clearIdbSolAddressMainnet();

			expect(idbKeyval.clear).toHaveBeenCalledExactlyOnceWith(expect.any(Object));
		});
	});

	describe('Edge cases', () => {
		it('should handle undefined address when updating last usage', async () => {
			// eslint-disable-next-line local-rules/prefer-object-params
			vi.mocked(idbKeyval.update).mockImplementation((_, updater) => {
				const result = updater(undefined);

				expect(result).toBeUndefined();

				return Promise.resolve();
			});

			await updateIdbBtcAddressMainnetLastUsage(mockPrincipal);

			expect(idbKeyval.update).toHaveBeenCalled();
		});

		it('should return undefined when getting non-existent address', async () => {
			vi.mocked(idbKeyval.get).mockResolvedValue(undefined);

			const result = await getIdbBtcAddressMainnet(mockPrincipal);

			expect(result).toBeUndefined();
		});
	});
});
