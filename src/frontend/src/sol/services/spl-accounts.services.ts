import type { SolAddress } from '$lib/types/address';
import { TOKEN_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { SolInstruction } from '$sol/types/sol-instructions';
import {
	findAssociatedTokenPda,
	getCreateAssociatedTokenInstructionAsync
} from '@solana-program/token';
import { address as solAddress } from '@solana/addresses';
import type { TransactionSigner } from '@solana/signers';

export const createAtaInstruction = async ({
	signer,
	destination,
	tokenAddress
}: {
	signer: TransactionSigner;
	destination: SolAddress;
	tokenAddress: SolAddress;
}): Promise<{ ataInstruction: SolInstruction; ataAddress: SolAddress }> => {
	const ataInstruction = await getCreateAssociatedTokenInstructionAsync({
		payer: signer,
		mint: solAddress(tokenAddress),
		owner: solAddress(destination)
	});

	const [ataAddress] = await findAssociatedTokenPda({
		owner: solAddress(destination),
		tokenProgram: solAddress(TOKEN_PROGRAM_ADDRESS),
		mint: solAddress(tokenAddress)
	});

	return { ataInstruction, ataAddress };
};
