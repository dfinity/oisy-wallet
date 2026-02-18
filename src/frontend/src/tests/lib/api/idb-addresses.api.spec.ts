import {
	clearIdbBtcAddressMainnet,
	clearIdbBtcAddressTestnet,
	clearIdbEthAddress,
	clearIdbSolAddressDevnet,
	clearIdbSolAddressLocal,
	clearIdbSolAddressMainnet
} from '$lib/api/idb-addresses.api';
import * as idbKeyval from 'idb-keyval';

vi.mock('$app/environment', () => ({
	browser: true
}));

describe('idb-addresses.api', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('clearIdbBtcAddressMainnet', () => {
		it('should clear BTC addresses', async () => {
			await clearIdbBtcAddressMainnet();

			expect(idbKeyval.clear).toHaveBeenCalledExactlyOnceWith(expect.any(Object));
		});
	});

	describe('clearIdbBtcAddressTestnet', () => {
		it('should clear BTC addresses', async () => {
			await clearIdbBtcAddressTestnet();

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

	describe('clearIdbSolAddressDevnet', () => {
		it('should clear SOL addresses', async () => {
			await clearIdbSolAddressDevnet();

			expect(idbKeyval.clear).toHaveBeenCalledExactlyOnceWith(expect.any(Object));
		});
	});

	describe('clearIdbSolAddressLocal', () => {
		it('should clear SOL addresses', async () => {
			await clearIdbSolAddressLocal();

			expect(idbKeyval.clear).toHaveBeenCalledExactlyOnceWith(expect.any(Object));
		});
	});
});
