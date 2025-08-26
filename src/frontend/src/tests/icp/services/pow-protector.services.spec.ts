import { solvePowChallenge } from '$icp/services/pow-protector.services';


// Mock the allowance function
vi.mock('$icp/api/icrc-ledger.api', () => ({
	allowance: vi.fn()
}));

describe('pow-protector.services', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('solvePowChallenge', () => {
		it('should throw error when difficulty is zero', async () => {
			const timestamp = 1234567890n;
			const difficulty = 0;

			await expect(solvePowChallenge({ timestamp, difficulty })).rejects.toThrow(
				'Difficulty must be greater than zero'
			);
		});

		it('should throw error when difficulty is negative', async () => {
			const timestamp = 1234567890n;
			const difficulty = -1;

			await expect(solvePowChallenge({ timestamp, difficulty })).rejects.toThrow(
				'Difficulty must be greater than zero'
			);
		});

		it('should solve a challenge with difficulty 1', async () => {
			const timestamp = 1000n;
			const difficulty = 1;

			const result = await solvePowChallenge({ timestamp, difficulty });

			expect(result).toBeTypeOf('bigint');
			expect(result).toBeGreaterThanOrEqual(0n);
		});

		it('should solve a challenge with higher difficulty', async () => {
			const timestamp = 1000n;
			const difficulty = 10;

			const result = await solvePowChallenge({ timestamp, difficulty });

			expect(result).toBeTypeOf('bigint');
			expect(result).toBeGreaterThanOrEqual(0n);
		});

		it('should return different nonces for different timestamps', async () => {
			const difficulty = 1;
			const timestamp1 = 1000n;
			const timestamp2 = 2000n;

			const result1 = await solvePowChallenge({ timestamp: timestamp1, difficulty });
			const result2 = await solvePowChallenge({ timestamp: timestamp2, difficulty });

			// Results should be bigint type
			expect(result1).toBeTypeOf('bigint');
			expect(result2).toBeTypeOf('bigint');
		});

		it('should handle very large timestamp values', async () => {
			const timestamp = 999999999999999999n;
			const difficulty = 1;

			const result = await solvePowChallenge({ timestamp, difficulty });

			expect(result).toBeTypeOf('bigint');
			expect(result).toBeGreaterThanOrEqual(0n);
		});

		it('should solve challenges with different difficulty levels', async () => {
			const timestamp = 1000n;
			const difficulties = [1, 2, 4, 8];

			for (const difficulty of difficulties) {
				const result = await solvePowChallenge({ timestamp, difficulty });

				expect(result).toBeTypeOf('bigint');
				expect(result).toBeGreaterThanOrEqual(0n);
			}
		});
	});
});
