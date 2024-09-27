import { currentBtcAddress } from '$btc/derived/current-address.derived';
import { BTC_MAINNET_NETWORK_ID, BTC_TESTNET_NETWORK_ID } from '$env/networks.env';
import { btcAddressMainnetStore, btcAddressTestnetStore } from '$lib/stores/address.store';
import { testnetsStore } from '$lib/stores/settings.store';
import { get } from 'svelte/store';
import { page } from '../../mocks/stores.mock';

describe('current-address.derived', () => {
	describe('currentBtcAddress', () => {
		beforeEach(() => {
			page.reset();
			testnetsStore.reset({ key: 'testnets' });
			btcAddressMainnetStore.reset();
			btcAddressTestnetStore.reset();
		});

		it('returns `null` if the selected network is not btc', () => {
			const currentAddress = get(currentBtcAddress);
			expect(currentAddress).toBeNull();
		});

		it('returns bitcoin mainnet if the selected network is mainnet btc', () => {
			page.mock({ data: { network: BTC_MAINNET_NETWORK_ID.description } });
			const testAddress = 'test';
			btcAddressMainnetStore.set({ data: testAddress, certified: true });
			const currentAddress = get(currentBtcAddress);
			expect(currentAddress).toBe(testAddress);
		});

		it('returns `null` if the selected network is mainnet btc but address is not yet loaded.', () => {
			page.mock({ data: { network: BTC_MAINNET_NETWORK_ID.description } });
			btcAddressMainnetStore.reset();
			const currentAddress = get(currentBtcAddress);
			expect(currentAddress).toBeNull();
		});

		it('returns bitcoin testnet if the selected network is testnet btc', () => {
			page.mock({ data: { network: BTC_TESTNET_NETWORK_ID.description } });
			testnetsStore.set({ value: { enabled: true }, key: 'testnets' });
			const testAddress = 'test';
			btcAddressTestnetStore.set({ data: testAddress, certified: true });
			const currentAddress = get(currentBtcAddress);
			expect(currentAddress).toBe(testAddress);
		});
	});
});
