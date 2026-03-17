import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { EVM_ERC20_TOKENS } from '$env/tokens/tokens-evm/tokens.erc20.env';
import { SUPPORTED_EVM_TOKENS } from '$env/tokens/tokens-evm/tokens.evm.env';
import { SUPPORTED_BITCOIN_TOKENS } from '$env/tokens/tokens.btc.env';
import { ERC4626_TOKENS } from '$env/tokens/tokens.erc4626.env';
import { SUPPORTED_ETHEREUM_TOKENS } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { HARVEST_AUTOPILOT_ADDRESSES } from '$eth/constants/harvest-autopilots.constants';
import {
	getHarvestAutopilotVaultTransactions,
	isTokenHarvestAutopilot
} from '$eth/utils/harvest-autopilots.utils';
import type { TokenUi } from '$lib/types/token-ui';
import type { Vault } from '$lib/types/vaults';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockValidErc4626Token } from '$tests/mocks/erc4626-tokens.mock';
import {
	createMockEthCertifiedTransactions,
	mockEthTransaction
} from '$tests/mocks/eth-transactions.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';

describe('harvest-autopilots.utils', () => {
	describe('isTokenHarvestAutopilot', () => {
		const harvestAutopilotTokens = ERC4626_TOKENS.filter((token) =>
			HARVEST_AUTOPILOT_ADDRESSES.includes(token.address.toLowerCase())
		);

		const nonHarvestErc4626Tokens = ERC4626_TOKENS.filter(
			(token) => !HARVEST_AUTOPILOT_ADDRESSES.includes(token.address.toLowerCase())
		);

		it.each(harvestAutopilotTokens)(
			'should return true for harvest autopilot token $name',
			(token) => {
				expect(isTokenHarvestAutopilot(token)).toBeTruthy();
			}
		);

		if (nonHarvestErc4626Tokens.length > 0) {
			it.each(nonHarvestErc4626Tokens)(
				'should return false for non-harvest erc4626 token $name',
				(token) => {
					expect(isTokenHarvestAutopilot(token)).toBeFalsy();
				}
			);
		}

		it.each([
			ICP_TOKEN,
			...SUPPORTED_BITCOIN_TOKENS,
			...SUPPORTED_ETHEREUM_TOKENS,
			...SUPPORTED_EVM_TOKENS,
			...EVM_ERC20_TOKENS
		])('should return false for non-erc4626 token $name', (token) => {
			expect(isTokenHarvestAutopilot(token)).toBeFalsy();
		});
	});

	describe('getHarvestAutopilotVaultTransactions', () => {
		const mockTokenId = parseTokenId('MockHarvestVaultTokenId');

		const mockVaultToken = {
			...mockValidErc4626Token,
			id: mockTokenId,
			network: ETHEREUM_NETWORK,
			standard: { code: 'erc4626' as const },
			enabled: true
		} as TokenUi<Vault['token']>;

		const mockAssetToken = {
			...mockValidErc20Token,
			enabled: true
		};

		const mockCertifiedTransactions = createMockEthCertifiedTransactions(3);

		const ckMinterInfoAddresses: string[] = [];

		it('should return empty array when vault transactions are empty', () => {
			const result = getHarvestAutopilotVaultTransactions({
				vaultToken: mockVaultToken,
				vaultTransactions: [],
				ethAddress: mockEthAddress,
				ckMinterInfoAddresses
			});

			expect(result).toEqual([]);
		});

		it('should return mapped transactions when vault transactions exist', () => {
			const result = getHarvestAutopilotVaultTransactions({
				vaultToken: mockVaultToken,
				vaultTransactions: mockCertifiedTransactions,
				ethAddress: mockEthAddress,
				ckMinterInfoAddresses
			});

			expect(result).toHaveLength(3);
		});

		it('should map transaction type based on ethAddress', () => {
			const singleTransaction = createMockEthCertifiedTransactions(1);

			const result = getHarvestAutopilotVaultTransactions({
				vaultToken: mockVaultToken,
				vaultTransactions: singleTransaction,
				ethAddress: mockEthAddress,
				ckMinterInfoAddresses
			});

			expect(result).toHaveLength(1);
			expect(result[0].type).toBe('send');
		});

		it('should map transaction type to receive when ethAddress does not match from', () => {
			const singleTransaction = createMockEthCertifiedTransactions(1);

			const result = getHarvestAutopilotVaultTransactions({
				vaultToken: mockVaultToken,
				vaultTransactions: singleTransaction,
				ethAddress: '0xDifferentAddress',
				ckMinterInfoAddresses
			});

			expect(result).toHaveLength(1);
			expect(result[0].type).toBe('receive');
		});

		it('should map transaction type to withdraw when from is in ckMinterInfoAddresses', () => {
			const singleTransaction = createMockEthCertifiedTransactions(1);

			const result = getHarvestAutopilotVaultTransactions({
				vaultToken: mockVaultToken,
				vaultTransactions: singleTransaction,
				ethAddress: mockEthAddress,
				ckMinterInfoAddresses: [mockEthTransaction.from.toLowerCase()]
			});

			expect(result).toHaveLength(1);
			expect(result[0].type).toBe('withdraw');
		});

		it('should include asset transactions that reference the vault token address', () => {
			const assetTransactions = createMockEthCertifiedTransactions(1).map((tx) => ({
				...tx,
				data: {
					...tx.data,
					to: mockVaultToken.address
				}
			}));

			const result = getHarvestAutopilotVaultTransactions({
				vaultToken: mockVaultToken,
				vaultTransactions: [],
				assetToken: mockAssetToken,
				assetTransactions,
				ethAddress: mockEthAddress,
				ckMinterInfoAddresses
			});

			expect(result).toHaveLength(1);
			expect(result[0].token).toBe(mockAssetToken);
			expect(result[0].vaultToken).toBe(mockVaultToken);
		});

		it('should exclude asset transactions that do not reference the vault token address', () => {
			const assetTransactions = createMockEthCertifiedTransactions(2);

			const result = getHarvestAutopilotVaultTransactions({
				vaultToken: mockVaultToken,
				vaultTransactions: [],
				assetToken: mockAssetToken,
				assetTransactions,
				ethAddress: mockEthAddress,
				ckMinterInfoAddresses
			});

			expect(result).toHaveLength(0);
		});

		it('should combine vault and asset transactions', () => {
			const vaultTransactions = createMockEthCertifiedTransactions(2);
			const assetTransactions = createMockEthCertifiedTransactions(1).map((tx) => ({
				...tx,
				data: {
					...tx.data,
					from: mockVaultToken.address
				}
			}));

			const result = getHarvestAutopilotVaultTransactions({
				vaultToken: mockVaultToken,
				vaultTransactions,
				assetToken: mockAssetToken,
				assetTransactions,
				ethAddress: mockEthAddress,
				ckMinterInfoAddresses
			});

			expect(result).toHaveLength(3);
			expect(result[0].token).toBe(mockVaultToken);
			expect(result[1].token).toBe(mockVaultToken);
			expect(result[2].token).toBe(mockAssetToken);
		});

		it('should not include asset transactions when assetToken is undefined', () => {
			const assetTransactions = createMockEthCertifiedTransactions(1).map((tx) => ({
				...tx,
				data: { ...tx.data, to: mockVaultToken.address }
			}));

			const result = getHarvestAutopilotVaultTransactions({
				vaultToken: mockVaultToken,
				vaultTransactions: [],
				assetToken: undefined,
				assetTransactions,
				ethAddress: mockEthAddress,
				ckMinterInfoAddresses
			});

			expect(result).toHaveLength(0);
		});
	});
});
