import {
	AlreadyClaimedError,
	AuthClientNotInitializedError,
	EligibilityError,
	GldtUnstakeDissolvementsLimitReached,
	InvalidCampaignError,
	InvalidCodeError,
	InvalidMetadataImageUrl,
	InvalidTokenUri,
	NftError,
	UserNotVipError,
	UserProfileNotFoundError
} from '$lib/types/errors';

describe('errors', () => {
	describe('UserProfileNotFoundError', () => {
		it('should be an instance of Error', () => {
			expect(new UserProfileNotFoundError()).toBeInstanceOf(Error);
		});
	});

	describe('UserNotVipError', () => {
		it('should be an instance of Error', () => {
			expect(new UserNotVipError()).toBeInstanceOf(Error);
		});
	});

	describe('EligibilityError', () => {
		it('should be an instance of Error', () => {
			expect(new EligibilityError()).toBeInstanceOf(Error);
		});
	});

	describe('InvalidCodeError', () => {
		it('should be an instance of Error', () => {
			expect(new InvalidCodeError()).toBeInstanceOf(Error);
		});
	});

	describe('AlreadyClaimedError', () => {
		it('should be an instance of Error', () => {
			expect(new AlreadyClaimedError()).toBeInstanceOf(Error);
		});
	});

	describe('InvalidCampaignError', () => {
		it('should be an instance of Error', () => {
			expect(new InvalidCampaignError()).toBeInstanceOf(Error);
		});
	});

	describe('GldtUnstakeDissolvementsLimitReached', () => {
		it('should be an instance of Error', () => {
			expect(new GldtUnstakeDissolvementsLimitReached()).toBeInstanceOf(Error);
		});
	});

	describe('NftError', () => {
		it('should be an instance of Error', () => {
			const error = new NftError('https://token.uri', '0xcontract');

			expect(error).toBeInstanceOf(Error);
		});

		it('should return the tokenUri', () => {
			const error = new NftError('https://token.uri', '0xcontract');

			expect(error.tokenUri).toBe('https://token.uri');
		});

		it('should return the contractAddress', () => {
			const error = new NftError('https://token.uri', '0xcontract');

			expect(error.contractAddress).toBe('0xcontract');
		});
	});

	describe('InvalidTokenUri', () => {
		it('should be an instance of NftError', () => {
			const error = new InvalidTokenUri('https://token.uri', '0xcontract');

			expect(error).toBeInstanceOf(NftError);
		});

		it('should expose tokenUri and contractAddress', () => {
			const error = new InvalidTokenUri('https://token.uri', '0xcontract');

			expect(error.tokenUri).toBe('https://token.uri');
			expect(error.contractAddress).toBe('0xcontract');
		});
	});

	describe('InvalidMetadataImageUrl', () => {
		it('should be an instance of NftError', () => {
			const error = new InvalidMetadataImageUrl('https://image.url', '0xcontract');

			expect(error).toBeInstanceOf(NftError);
		});

		it('should expose tokenUri and contractAddress', () => {
			const error = new InvalidMetadataImageUrl('https://image.url', '0xcontract');

			expect(error.tokenUri).toBe('https://image.url');
			expect(error.contractAddress).toBe('0xcontract');
		});
	});

	describe('AuthClientNotInitializedError', () => {
		it('should be an instance of Error', () => {
			expect(new AuthClientNotInitializedError()).toBeInstanceOf(Error);
		});
	});
});
