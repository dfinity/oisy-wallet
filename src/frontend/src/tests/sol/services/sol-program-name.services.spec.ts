import { getAccountData } from '$sol/api/solana.api';
import { SOLANA_KNOWN_PROGRAM_NAMES } from '$sol/constants/sol-programs.constants';
import { loadSolProgramNames } from '$sol/services/sol-program-name.services';
import { solProgramNameStore } from '$sol/stores/sol-program-name.store';
import type { SolInstructionSummary } from '$sol/types/sol-instruction-summary';
import {
	decodeSolProgramIdlName,
	findSolProgramIdlAddress
} from '$sol/utils/sol-program-idl.utils';
import { mockSolAddress, mockSolAddress2 } from '$tests/mocks/sol.mock';
import { get } from 'svelte/store';

vi.mock('$sol/api/solana.api', () => ({
	getAccountData: vi.fn()
}));

vi.mock('$sol/utils/sol-program-idl.utils', () => ({
	findSolProgramIdlAddress: vi.fn(),
	decodeSolProgramIdlName: vi.fn()
}));

describe('sol-program-name.services', () => {
	describe('loadSolProgramNames', () => {
		const network = 'mainnet' as const;

		const route: SolInstructionSummary = { kind: 'route', program: mockSolAddress };
		const send: SolInstructionSummary = { kind: 'send', amount: 100n };

		beforeEach(() => {
			vi.clearAllMocks();

			solProgramNameStore.reset();

			vi.mocked(findSolProgramIdlAddress).mockResolvedValue(mockSolAddress2);
			vi.mocked(getAccountData).mockResolvedValue(new Uint8Array([1, 2, 3]));
			vi.mocked(decodeSolProgramIdlName).mockResolvedValue('jupiter');
		});

		it('should name the program a route ran through', async () => {
			await expect(loadSolProgramNames({ instructions: [route], network })).resolves.toStrictEqual([
				{ ...route, programName: 'jupiter' }
			]);

			expect(findSolProgramIdlAddress).toHaveBeenCalledExactlyOnceWith({
				programAddress: mockSolAddress
			});
			expect(getAccountData).toHaveBeenCalledExactlyOnceWith({
				address: mockSolAddress2,
				network
			});
		});

		it('should leave an instruction that names no program untouched', async () => {
			await expect(loadSolProgramNames({ instructions: [send], network })).resolves.toStrictEqual([
				send
			]);

			expect(getAccountData).not.toHaveBeenCalled();
		});

		it('should ask about a program only once, even when it publishes nothing', async () => {
			vi.mocked(getAccountData).mockResolvedValue(undefined);

			await expect(loadSolProgramNames({ instructions: [route], network })).resolves.toStrictEqual([
				route
			]);
			await expect(loadSolProgramNames({ instructions: [route], network })).resolves.toStrictEqual([
				route
			]);

			expect(getAccountData).toHaveBeenCalledOnce();
		});

		it('should ask about a program only once across reviews', async () => {
			await loadSolProgramNames({ instructions: [route], network });

			await expect(loadSolProgramNames({ instructions: [route], network })).resolves.toStrictEqual([
				{ ...route, programName: 'jupiter' }
			]);

			expect(getAccountData).toHaveBeenCalledOnce();
		});

		it('should ask about the same program once when it appears twice in one review', async () => {
			await loadSolProgramNames({ instructions: [route, route], network });

			expect(getAccountData).toHaveBeenCalledOnce();
		});

		// A program that could not answer is not the same as one that has nothing to say.
		it('should leave a program unnamed and ask again when the read fails', async () => {
			vi.mocked(getAccountData).mockRejectedValueOnce(new Error('rate limited'));

			await expect(loadSolProgramNames({ instructions: [route], network })).resolves.toStrictEqual([
				route
			]);

			expect(console.warn).toHaveBeenCalledOnce();

			await expect(loadSolProgramNames({ instructions: [route], network })).resolves.toStrictEqual([
				{ ...route, programName: 'jupiter' }
			]);

			expect(getAccountData).toHaveBeenCalledTimes(2);
		});

		it('should not name a program whose account is not an IDL', async () => {
			vi.mocked(decodeSolProgramIdlName).mockResolvedValue(undefined);

			await expect(loadSolProgramNames({ instructions: [route], network })).resolves.toStrictEqual([
				route
			]);
		});

		// The same address is a different deployment on each cluster.
		it('should keep the names of one network out of another', async () => {
			await loadSolProgramNames({ instructions: [route], network });

			expect(get(solProgramNameStore).devnet).toBeUndefined();

			vi.mocked(decodeSolProgramIdlName).mockResolvedValue('something-else');

			await expect(
				loadSolProgramNames({ instructions: [route], network: 'devnet' })
			).resolves.toStrictEqual([{ ...route, programName: 'something-else' }]);
		});

		describe('with a program OISY knows by name', () => {
			const [[knownProgram, knownName]] = Object.entries(SOLANA_KNOWN_PROGRAM_NAMES);

			const knownRoute: SolInstructionSummary = { kind: 'route', program: knownProgram };

			it('should name it without asking the network', async () => {
				await expect(
					loadSolProgramNames({ instructions: [knownRoute], network })
				).resolves.toStrictEqual([{ ...knownRoute, programName: knownName }]);

				expect(findSolProgramIdlAddress).not.toHaveBeenCalled();
				expect(getAccountData).not.toHaveBeenCalled();
			});

			// The vetted name is the venue's, the published one is its crate's.
			it('should prefer it to the name the program publishes for itself', async () => {
				vi.mocked(decodeSolProgramIdlName).mockResolvedValue('jupiter');

				await expect(
					loadSolProgramNames({ instructions: [knownRoute], network })
				).resolves.toStrictEqual([{ ...knownRoute, programName: knownName }]);
			});

			it('should still ask about a program it does not know', async () => {
				await expect(
					loadSolProgramNames({ instructions: [knownRoute, route], network })
				).resolves.toStrictEqual([
					{ ...knownRoute, programName: knownName },
					{ ...route, programName: 'jupiter' }
				]);

				expect(getAccountData).toHaveBeenCalledOnce();
			});
		});

		it('should do nothing when there are no instructions', async () => {
			await expect(loadSolProgramNames({ instructions: [], network })).resolves.toStrictEqual([]);

			expect(getAccountData).not.toHaveBeenCalled();
		});
	});
});
