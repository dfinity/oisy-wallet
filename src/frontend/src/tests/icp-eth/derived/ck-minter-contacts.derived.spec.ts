import { ETHEREUM_TOKEN_ID, SEPOLIA_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import { ckMinterBuiltInContacts } from '$icp-eth/derived/ck-minter-contacts.derived';
import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
import {
	mockCkEthereumMinterAddress,
	mockCkMinterInfo,
	mockErc20HelperContractAddress,
	mockEthHelperContractAddress
} from '$tests/mocks/ck-minter.mock';
import { get } from 'svelte/store';

describe('ck-minter-contacts.derived', () => {
	const certifiedMinterInfo = { data: mockCkMinterInfo, certified: true };

	beforeEach(() => {
		ckEthMinterInfoStore.reinitialize();
	});

	describe('ckMinterBuiltInContacts', () => {
		it('should return empty array when store is not initialized', () => {
			expect(get(ckMinterBuiltInContacts)).toEqual([]);
		});

		it('should return contacts for ETHEREUM_TOKEN_ID entry', () => {
			ckEthMinterInfoStore.set({
				id: ETHEREUM_TOKEN_ID,
				data: certifiedMinterInfo
			});

			const result = get(ckMinterBuiltInContacts);

			expect(result).toHaveLength(3);
			expect(result[0].name).toBe('ckETH Minter Helper Contract');
			expect(result[1].name).toBe('ckERC20 Minter Helper Contract');
			expect(result[2].name).toBe('CK Ethereum Minter');
		});

		it('should return contacts for SEPOLIA_TOKEN_ID entry', () => {
			ckEthMinterInfoStore.set({
				id: SEPOLIA_TOKEN_ID,
				data: certifiedMinterInfo
			});

			const result = get(ckMinterBuiltInContacts);

			expect(result).toHaveLength(3);
			expect(result[0].name).toBe('ckETH Minter Helper Contract');
		});

		it('should return contacts for both token IDs when both are present', () => {
			ckEthMinterInfoStore.set({
				id: ETHEREUM_TOKEN_ID,
				data: certifiedMinterInfo
			});
			ckEthMinterInfoStore.set({
				id: SEPOLIA_TOKEN_ID,
				data: certifiedMinterInfo
			});

			const result = get(ckMinterBuiltInContacts);

			expect(result).toHaveLength(6);
		});

		it('should use idOffset 0 for ETHEREUM_TOKEN_ID (first token)', () => {
			ckEthMinterInfoStore.set({
				id: ETHEREUM_TOKEN_ID,
				data: certifiedMinterInfo
			});

			const result = get(ckMinterBuiltInContacts);

			expect(result[0].id).toBe(-100_000n);
			expect(result[1].id).toBe(-100_001n);
			expect(result[2].id).toBe(-100_002n);
		});

		it('should use idOffset 1000 for SEPOLIA_TOKEN_ID (second token)', () => {
			ckEthMinterInfoStore.set({
				id: SEPOLIA_TOKEN_ID,
				data: certifiedMinterInfo
			});

			const result = get(ckMinterBuiltInContacts);

			expect(result[0].id).toBe(-101_000n);
			expect(result[1].id).toBe(-101_001n);
			expect(result[2].id).toBe(-101_002n);
		});

		it('should return correct addresses for each contact', () => {
			ckEthMinterInfoStore.set({
				id: ETHEREUM_TOKEN_ID,
				data: certifiedMinterInfo
			});

			const result = get(ckMinterBuiltInContacts);

			expect(result[0].addresses[0].address).toBe(mockEthHelperContractAddress);
			expect(result[1].addresses[0].address).toBe(mockErc20HelperContractAddress);
			expect(result[2].addresses[0].address).toBe(mockCkEthereumMinterAddress);
		});

		it('should return empty array for token ID with nullish info', () => {
			ckEthMinterInfoStore.set({
				id: ETHEREUM_TOKEN_ID,
				data: certifiedMinterInfo
			});

			const result = get(ckMinterBuiltInContacts);
			const ethContacts = result.filter(({ id }) => id >= -100_002n && id <= -100_000n);
			const sepoliaContacts = result.filter(({ id }) => id < -100_002n);

			expect(ethContacts).toHaveLength(3);
			expect(sepoliaContacts).toHaveLength(0);
		});

		it('should concatenate contacts from both token IDs in order', () => {
			ckEthMinterInfoStore.set({
				id: ETHEREUM_TOKEN_ID,
				data: certifiedMinterInfo
			});
			ckEthMinterInfoStore.set({
				id: SEPOLIA_TOKEN_ID,
				data: certifiedMinterInfo
			});

			const result = get(ckMinterBuiltInContacts);

			const ethIds = result.slice(0, 3).map(({ id }) => id);
			const sepoliaIds = result.slice(3, 6).map(({ id }) => id);

			expect(ethIds).toEqual([-100_000n, -100_001n, -100_002n]);
			expect(sepoliaIds).toEqual([-101_000n, -101_001n, -101_002n]);
		});
	});
});
