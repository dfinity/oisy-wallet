import type { SolAddress } from '$lib/types/address';
import type { SolInstruction } from '$sol/types/sol-instructions';
import type { SplTokenAddress } from '$sol/types/spl';
import {
	findAssociatedTokenPda,
	getCreateAssociatedTokenInstructionAsync
} from '@solana-program/token';
import { address as solAddress } from '@solana/addresses';
import type { TransactionSigner } from '@solana/signers';

export const calculateAssociatedTokenAddress = async ({
	owner,
	tokenAddress,
	tokenOwnerAddress
}: {
	owner: SolAddress;
	tokenAddress: SplTokenAddress;
	tokenOwnerAddress: SolAddress;
}): Promise<SolAddress> => {
	const [ataAddress] = await findAssociatedTokenPda({
		owner: solAddress(owner),
		tokenProgram: solAddress(tokenOwnerAddress),
		mint: solAddress(tokenAddress)
	});

	return ataAddress;
};

export const createAtaInstruction = async ({
	signer,
	destination,
	tokenAddress
}: {
	signer: TransactionSigner;
	destination: SolAddress;
	tokenAddress: SplTokenAddress;
}): Promise<SolInstruction> =>
	await getCreateAssociatedTokenInstructionAsync({
		payer: signer,
		mint: solAddress(tokenAddress),
		owner: solAddress(destination)
	});
