import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { selectedAssetsTab, userSelectedNetwork } from '$lib/derived/nav.derived';
import { TokenTypes as TokenTypesEnum } from '$lib/enums/token-types';
import { navStore } from '$lib/stores/nav.store';
import { get } from 'svelte/store';

describe('nav.derived', () => {
	beforeEach(() => {
		navStore.reset();
	});

	describe('userSelectedNetwork', () => {
		it('returns undefined when navStore has no userSelectedNetwork', () => {
			const value = get(userSelectedNetwork);

			expect(value).toBeUndefined();
		});

		it('returns the userSelectedNetwork from navStore when defined', () => {
			const mockNetwork = ETHEREUM_NETWORK_ID;
			navStore.setUserSelectedNetwork(mockNetwork);
			const value = get(userSelectedNetwork);

			expect(value).toEqual(mockNetwork);
		});

		it('does not overwrite selectedAssetsTab when updating userSelectedNetwork', () => {
			// set both
			navStore.setSelectedAssetsTab(TokenTypesEnum.NFTS);
			navStore.setUserSelectedNetwork(ETHEREUM_NETWORK_ID);

			expect(get(userSelectedNetwork)).toEqual(ETHEREUM_NETWORK_ID);
			expect(get(selectedAssetsTab)).toBe(TokenTypesEnum.NFTS);
		});
	});

	describe('selectedAssetsTab', () => {
		it('returns TOKENS as default when navStore.selectedAssetsTab is undefined', () => {
			navStore.setSelectedAssetsTab(TokenTypesEnum.TOKENS);
			const value = get(selectedAssetsTab);

			expect(value).toBe(TokenTypesEnum.TOKENS);
		});

		it('returns the selectedAssetsTab from navStore when defined', () => {
			navStore.setSelectedAssetsTab(TokenTypesEnum.NFTS);
			const value = get(selectedAssetsTab);

			expect(value).toBe(TokenTypesEnum.NFTS);
		});

		it('does not overwrite userSelectedNetwork when updating selectedAssetsTab', () => {
			// set both
			navStore.setUserSelectedNetwork(ETHEREUM_NETWORK_ID);
			navStore.setSelectedAssetsTab(TokenTypesEnum.NFTS);

			expect(get(selectedAssetsTab)).toBe(TokenTypesEnum.NFTS);
			expect(get(userSelectedNetwork)).toEqual(ETHEREUM_NETWORK_ID);
		});
	});
});
