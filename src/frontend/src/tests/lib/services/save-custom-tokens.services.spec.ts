import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { ETHEREUM_NETWORK, SEPOLIA_NETWORK } from '$env/networks/networks.eth.env';
import { loadCustomTokens as loadCustomErc1155Tokens } from '$eth/services/erc1155.services';
import { loadCustomTokens as loadCustomErc20Tokens } from '$eth/services/erc20.services';
import { loadCustomTokens as loadCustomErc721Tokens } from '$eth/services/erc721.services';
import { erc1155CustomTokensStore } from '$eth/stores/erc1155-custom-tokens.store';
import { erc20CustomTokensStore } from '$eth/stores/erc20-custom-tokens.store';
import { erc721CustomTokensStore } from '$eth/stores/erc721-custom-tokens.store';
import { loadCustomTokens as loadCustomExtTokens } from '$icp/services/ext.services';
import { loadCustomTokens as loadCustomIcrcTokens } from '$icp/services/icrc.services';
import { extCustomTokensStore } from '$icp/stores/ext-custom-tokens.store';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import { setManyCustomTokens } from '$lib/api/backend.api';
import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
import type { SaveTokensParams } from '$lib/services/manage-tokens.services';
import { saveCustomTokens } from '$lib/services/save-custom-tokens.services';
import type {
	ErcSaveCustomToken,
	ExtSaveCustomToken,
	IcrcSaveCustomToken,
	SaveCustomTokenWithKey,
	SplSaveCustomToken
} from '$lib/types/custom-token';
import type { NonEmptyArray } from '$lib/types/utils';
import { toCustomToken } from '$lib/utils/custom-token.utils';
import { loadCustomTokens as loadCustomSplTokens } from '$sol/services/spl.services';
import { splCustomTokensStore } from '$sol/stores/spl-custom-tokens.store';
import { mockEthAddress, mockEthAddress2, mockEthAddress3 } from '$tests/mocks/eth.mock';
import { mockExtV2TokenCanisterId } from '$tests/mocks/ext-v2-token.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIndexCanisterId, mockLedgerCanisterId } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockSplAddress } from '$tests/mocks/sol.mock';

vi.mock('$lib/api/backend.api', () => ({
	setManyCustomTokens: vi.fn()
}));

vi.mock('$eth/services/erc20.services', () => ({
	loadCustomTokens: vi.fn()
}));

vi.mock('$eth/services/erc721.services', () => ({
	loadCustomTokens: vi.fn()
}));

vi.mock('$eth/services/erc1155.services', () => ({
	loadCustomTokens: vi.fn()
}));

vi.mock('$icp/services/icrc.services', () => ({
	loadCustomTokens: vi.fn()
}));

vi.mock('$icp/services/ext.services', () => ({
	loadCustomTokens: vi.fn()
}));

vi.mock('$sol/services/spl.services', () => ({
	loadCustomTokens: vi.fn()
}));

describe('save-custom-tokens.services', () => {
	describe('saveCustomTokens', () => {
		const mockIcrcToken: IcrcSaveCustomToken = {
			ledgerCanisterId: mockLedgerCanisterId,
			indexCanisterId: mockIndexCanisterId
		};
		const mockExtToken: ExtSaveCustomToken = {
			canisterId: mockExtV2TokenCanisterId
		};
		const mockErc20Token: ErcSaveCustomToken = {
			address: mockEthAddress,
			chainId: ETHEREUM_NETWORK.chainId
		};
		const mockErc721Token: ErcSaveCustomToken = {
			address: mockEthAddress2,
			chainId: BASE_NETWORK.chainId
		};
		const mockErc1155Token: ErcSaveCustomToken = {
			address: mockEthAddress3,
			chainId: SEPOLIA_NETWORK.chainId
		};
		const mockSplToken: SplSaveCustomToken = {
			address: mockSplAddress,
			decimals: 8,
			symbol: 'TEST'
		};
		const mockTokens: SaveCustomTokenWithKey[] = [
			{ ...mockIcrcToken, networkKey: 'Icrc', enabled: true },
			{ ...mockExtToken, networkKey: 'ExtV2', enabled: true },
			{ ...mockErc20Token, networkKey: 'Erc20', enabled: true },
			{ ...mockErc721Token, networkKey: 'Erc721', enabled: true },
			{ ...mockErc1155Token, networkKey: 'Erc1155', enabled: true },
			{ ...mockSplToken, networkKey: 'SplMainnet', enabled: true }
		];

		const mockProgress = vi.fn();

		const mockParams: SaveTokensParams<SaveCustomTokenWithKey> = {
			progress: mockProgress,
			identity: mockIdentity,
			tokens: mockTokens as NonEmptyArray<SaveCustomTokenWithKey>
		};

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(icrcCustomTokensStore, 'resetByIdentifier');
			vi.spyOn(extCustomTokensStore, 'resetByIdentifier');
			vi.spyOn(erc20CustomTokensStore, 'resetByIdentifier');
			vi.spyOn(erc721CustomTokensStore, 'resetByIdentifier');
			vi.spyOn(erc1155CustomTokensStore, 'resetByIdentifier');
			vi.spyOn(splCustomTokensStore, 'resetByIdentifier');
		});

		it('should call the endpoint to set many custom tokens', async () => {
			await saveCustomTokens(mockParams);

			const expectedTokens = mockTokens.map(toCustomToken);

			expect(setManyCustomTokens).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				tokens: expectedTokens,
				nullishIdentityErrorMessage: en.auth.error.no_internet_identity
			});
		});

		it('should set the progress callback', async () => {
			await saveCustomTokens(mockParams);

			expect(mockProgress).toHaveBeenCalledTimes(2);
			expect(mockProgress).toHaveBeenNthCalledWith(1, ProgressStepsAddToken.SAVE);
			expect(mockProgress).toHaveBeenNthCalledWith(2, ProgressStepsAddToken.UPDATE_UI);
		});

		it('should hide the disabled tokens', async () => {
			const tokens = mockTokens.map((token) => ({
				...token,
				enabled: false
			})) as NonEmptyArray<SaveCustomTokenWithKey>;

			await saveCustomTokens({ ...mockParams, tokens });

			expect(icrcCustomTokensStore.resetByIdentifier).toHaveBeenCalledExactlyOnceWith(
				mockLedgerCanisterId
			);
			expect(extCustomTokensStore.resetByIdentifier).toHaveBeenCalledExactlyOnceWith(
				mockExtV2TokenCanisterId
			);
			expect(erc20CustomTokensStore.resetByIdentifier).toHaveBeenCalledExactlyOnceWith(
				`${mockEthAddress}#${ETHEREUM_NETWORK.chainId}`
			);
			expect(erc721CustomTokensStore.resetByIdentifier).toHaveBeenCalledExactlyOnceWith(
				`${mockEthAddress2}#${BASE_NETWORK.chainId}`
			);
			expect(erc1155CustomTokensStore.resetByIdentifier).toHaveBeenCalledExactlyOnceWith(
				`${mockEthAddress3}#${SEPOLIA_NETWORK.chainId}`
			);
			expect(splCustomTokensStore.resetByIdentifier).toHaveBeenCalledExactlyOnceWith(
				mockSplAddress
			);
		});

		it('should reload custom tokens at the end', async () => {
			await saveCustomTokens(mockParams);

			expect(loadCustomErc20Tokens).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
			expect(loadCustomErc721Tokens).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
			expect(loadCustomErc1155Tokens).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
			expect(loadCustomIcrcTokens).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
			expect(loadCustomExtTokens).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
			expect(loadCustomSplTokens).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
		});

		it('should fail if the setManyCustomTokens fails', async () => {
			const mockError = new Error('Mocked error when setting tokens');

			vi.mocked(setManyCustomTokens).mockRejectedValueOnce(mockError);

			await expect(saveCustomTokens(mockParams)).rejects.toThrowError(mockError);

			expect(mockProgress).toHaveBeenCalledExactlyOnceWith(ProgressStepsAddToken.SAVE);

			expect(loadCustomErc20Tokens).not.toHaveBeenCalled();
			expect(loadCustomErc721Tokens).not.toHaveBeenCalled();
			expect(loadCustomErc1155Tokens).not.toHaveBeenCalled();
			expect(loadCustomIcrcTokens).not.toHaveBeenCalled();
			expect(loadCustomExtTokens).not.toHaveBeenCalled();
			expect(loadCustomSplTokens).not.toHaveBeenCalled();
		});

		it('should fail if any loadCustomTokens fails', async () => {
			const mockError = new Error('Mocked error when loading tokens');

			vi.mocked(loadCustomErc20Tokens).mockRejectedValueOnce(mockError);

			await expect(saveCustomTokens(mockParams)).rejects.toThrowError(mockError);
		});
	});
});
