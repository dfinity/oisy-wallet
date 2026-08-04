import type { NftCollection } from '$lib/types/nft';
import type { Token } from '$lib/types/token';
import type { TokenToggleable } from '$lib/types/token-toggleable';
import {
	collectionStandardGuard,
	toggleableTokenGuard,
	tokenStandardGuard
} from '$lib/utils/token-guards.utils';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';

describe('token-guards.utils', () => {
	describe('tokenStandardGuard', () => {
		const isErc20 = tokenStandardGuard('erc20');

		it('returns true when the token standard code matches', () => {
			expect(isErc20(mockValidErc20Token)).toBeTruthy();
		});

		it('returns false when the token standard code differs', () => {
			expect(isErc20({ ...mockValidErc20Token, standard: { code: 'erc721' } })).toBeFalsy();
		});
	});

	describe('collectionStandardGuard', () => {
		const isErc721 = collectionStandardGuard('erc721');

		const collection = {
			standard: { code: 'erc721' }
		} as unknown as NftCollection;

		it('returns true when the collection standard code matches', () => {
			expect(isErc721(collection)).toBeTruthy();
		});

		it('returns false when the collection standard code differs', () => {
			expect(isErc721({ ...collection, standard: { code: 'erc1155' } })).toBeFalsy();
		});
	});

	describe('toggleableTokenGuard', () => {
		const guard = toggleableTokenGuard((token: Token) => token.standard.code === 'erc20');

		const toggleableErc20: TokenToggleable<Token> = { ...mockValidErc20Token, enabled: true };

		it('returns true only when the standard matches and the token is toggleable', () => {
			expect(guard(toggleableErc20)).toBeTruthy();
		});

		it('returns false when the token is not toggleable', () => {
			expect(guard(mockValidErc20Token)).toBeFalsy();
		});

		it('returns false when the standard does not match', () => {
			const wrongStandard: TokenToggleable<Token> = {
				...toggleableErc20,
				standard: { code: 'erc721' }
			};

			expect(guard(wrongStandard)).toBeFalsy();
		});
	});
});
