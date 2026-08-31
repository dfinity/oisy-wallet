import { consoleWarn } from '$lib/utils/console.utils';
import { getAccountData } from '$sol/api/solana.api';
import { SOLANA_KNOWN_PROGRAM_NAMES } from '$sol/constants/sol-programs.constants';
import { solProgramNameStore } from '$sol/stores/sol-program-name.store';
import type { SolAddress } from '$sol/types/address';
import type { SolanaNetworkType } from '$sol/types/network';
import type { SolInstructionSummary } from '$sol/types/sol-instruction-summary';
import {
	decodeSolProgramIdlName,
	findSolProgramIdlAddress
} from '$sol/utils/sol-program-idl.utils';
import { isNullish, nonNullish, notEmptyString } from '@dfinity/utils';
import { get } from 'svelte/store';

const loadName = async ({
	programAddress,
	network
}: {
	programAddress: SolAddress;
	network: SolanaNetworkType;
}): Promise<string> => {
	// A name OISY vetted beats the one the program writes about itself: it is the venue's name
	// rather than its crate's, and it covers the programs that publish no interface at all.
	const knownName = SOLANA_KNOWN_PROGRAM_NAMES[programAddress];

	if (notEmptyString(knownName)) {
		return knownName;
	}

	const idlAddress = await findSolProgramIdlAddress({ programAddress });

	const data = await getAccountData({ address: idlAddress, network });

	if (isNullish(data)) {
		return '';
	}

	return (await decodeSolProgramIdlName(data)) ?? '';
};

/**
 * Names the programs the review is about to show, from the interface each one publishes for itself,
 * and hands back the same instructions carrying the names that were found.
 *
 * Best effort by design, and per program: most programs publish nothing, and a read that fails
 * leaves one unnamed rather than failing the review it appeared in. Programs already asked about
 * are not asked again, including the ones that answered with nothing.
 *
 * What this produces is a label and only a label. The name is the program's own claim, written by
 * whoever holds the IDL authority and attested by no one, so it never promotes an instruction out
 * of unreviewed: it says which door the message knocks on, not what happens behind it.
 */
export const loadSolProgramNames = async ({
	instructions,
	network
}: {
	instructions: SolInstructionSummary[];
	network: SolanaNetworkType;
}): Promise<SolInstructionSummary[]> => {
	const programAddresses = instructions
		.map(({ program }) => program)
		.filter((program): program is SolAddress => nonNullish(program));

	const known = get(solProgramNameStore)[network] ?? {};

	const missing = [...new Set(programAddresses)].filter((address) => !(address in known));

	if (missing.length > 0) {
		const names = await Promise.all(
			missing.map(async (programAddress) => {
				try {
					return await loadName({ programAddress, network });
				} catch (err: unknown) {
					consoleWarn(
						`Could not read the interface Solana program ${programAddress} publishes`,
						err
					);

					return undefined;
				}
			})
		);

		solProgramNameStore.set({
			network,
			names: missing.reduce<Partial<Record<SolAddress, string>>>((acc, address, index) => {
				const name = names[index];

				// A program that failed to answer is left out rather than recorded as nameless, so a
				// timeout during one review does not silence it for the rest of the session.
				return nonNullish(name) ? { ...acc, [address]: name } : acc;
			}, {})
		});
	}

	const resolved = get(solProgramNameStore)[network] ?? {};

	return instructions.map((instruction) => {
		const { program } = instruction;

		const programName = nonNullish(program) ? resolved[program] : undefined;

		return notEmptyString(programName) ? { ...instruction, programName } : instruction;
	});
};
