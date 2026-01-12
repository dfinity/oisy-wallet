import {
	ResolveByProbingError,
	resolveByProbing,
	type ResolveGroup
} from '$lib/services/probing.services';

describe('probing.services', () => {
	describe('resolveByProbing', () => {
		const mockFn11 = vi.fn();
		const mockFn12 = vi.fn();

		const mockFn2 = vi.fn();

		const mockFn31 = vi.fn();
		const mockFn32 = vi.fn();
		const mockFn33 = vi.fn();

		const groups: ResolveGroup<string>[] = [
			{
				probes: [mockFn11, mockFn12],
				onResolve: () => 'first group'
			},
			{
				probes: [mockFn2],
				onResolve: () => 'second group'
			},
			{
				probes: [mockFn31, mockFn32, mockFn33],
				onResolve: () => 'third group'
			}
		];

		beforeEach(() => {
			vi.clearAllMocks();

			mockFn11.mockResolvedValue(true);
			mockFn12.mockResolvedValue(true);

			mockFn2.mockResolvedValue(true);

			mockFn31.mockResolvedValue(true);
			mockFn32.mockResolvedValue(true);
			mockFn33.mockResolvedValue(true);
		});

		it('should resolve with the first group if all the probes are successful', async () => {
			await expect(resolveByProbing(groups)).resolves.toBe('first group');

			expect(mockFn11).toHaveBeenCalledExactlyOnceWith();
			expect(mockFn12).toHaveBeenCalledExactlyOnceWith();

			expect(mockFn2).not.toHaveBeenCalled();

			expect(mockFn31).not.toHaveBeenCalled();
			expect(mockFn32).not.toHaveBeenCalled();
			expect(mockFn33).not.toHaveBeenCalled();
		});

		it('should call all the probes of a group', async () => {
			await resolveByProbing(groups);

			expect(mockFn11).toHaveBeenCalledExactlyOnceWith();
			expect(mockFn12).toHaveBeenCalledExactlyOnceWith();

			mockFn11.mockRejectedValue(new Error('Probe failed'));
			mockFn2.mockRejectedValue(new Error('Probe failed'));

			await resolveByProbing(groups);

			expect(mockFn2).toHaveBeenCalledExactlyOnceWith();

			expect(mockFn31).toHaveBeenCalledExactlyOnceWith();
			expect(mockFn32).toHaveBeenCalledExactlyOnceWith();
			expect(mockFn33).toHaveBeenCalledExactlyOnceWith();
		});

		it('should resolve if the group has an empty list of probes', async () => {
			const emptyGroup: ResolveGroup<string> = {
				probes: [],
				onResolve: () => 'empty group'
			};

			await expect(resolveByProbing([emptyGroup, ...groups])).resolves.toBe('empty group');

			expect(mockFn11).not.toHaveBeenCalled();
			expect(mockFn12).not.toHaveBeenCalled();

			expect(mockFn2).not.toHaveBeenCalled();

			expect(mockFn31).not.toHaveBeenCalled();
			expect(mockFn32).not.toHaveBeenCalled();
			expect(mockFn33).not.toHaveBeenCalled();
		});

		it('should resolve with the first group that has all probes successful', async () => {
			mockFn11.mockRejectedValue(new Error('Probe failed'));

			await expect(resolveByProbing(groups)).resolves.toBe('second group');

			expect(mockFn11).toHaveBeenCalledExactlyOnceWith();
			expect(mockFn12).toHaveBeenCalledExactlyOnceWith();

			expect(mockFn2).toHaveBeenCalledExactlyOnceWith();

			expect(mockFn31).not.toHaveBeenCalled();
			expect(mockFn32).not.toHaveBeenCalled();
			expect(mockFn33).not.toHaveBeenCalled();
		});

		it('should trows if all probes fail', async () => {
			mockFn11.mockRejectedValue(new Error('Probe 1 failed'));
			mockFn2.mockRejectedValue(new Error('Probe 2 failed'));
			mockFn31.mockRejectedValue(new Error('Probe 3 failed'));

			await expect(resolveByProbing(groups)).rejects.toThrowError(
				new ResolveByProbingError(
					'All probing groups failed: Error: Probe 1 failed | Error: Probe 2 failed | Error: Probe 3 failed'
				)
			);

			expect(mockFn11).toHaveBeenCalledExactlyOnceWith();
			expect(mockFn12).toHaveBeenCalledExactlyOnceWith();

			expect(mockFn2).toHaveBeenCalledExactlyOnceWith();

			expect(mockFn31).toHaveBeenCalledExactlyOnceWith();
			expect(mockFn32).toHaveBeenCalledExactlyOnceWith();
			expect(mockFn33).toHaveBeenCalledExactlyOnceWith();
		});

		it('should throw if the list of groups is empty', async () => {
			await expect(resolveByProbing([])).rejects.toThrowError('No probing groups provided');
		});
	});
});
