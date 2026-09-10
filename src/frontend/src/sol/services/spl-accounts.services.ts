import type { SolAddress } from '$sol/types/address';
import type { SolInstruction } from '$sol/types/sol-instructions';
import type { SplTokenAddress } from '$sol/types/spl';
import {
	findAssociatedTokenPda,
	getCreateAssociatedTokenInstructionAsync
} from '@solana-program/token';
import { address as solAddress, type TransactionSigner } from '@solana/kit';

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
	tokenAddress,
	tokenOwnerAddress
}: {
	signer: TransactionSigner;
	destination: SolAddress;
	tokenAddress: SplTokenAddress;
	tokenOwnerAddress: SolAddress;
}): Promise<SolInstruction> =>
	await getCreateAssociatedTokenInstructionAsync({
		payer: signer,
		owner: solAddress(destination),
		mint: solAddress(tokenAddress),
		tokenProgram: solAddress(tokenOwnerAddress)
	});
