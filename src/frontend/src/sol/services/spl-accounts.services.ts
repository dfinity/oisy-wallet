import { ZERO } from '$lib/constants/app.constants';
import type { SolAddress } from '$lib/types/address';
import { checkIfAccountExists, loadTokenBalance } from '$sol/api/solana.api';
import type { SolanaNetworkType } from '$sol/types/network';
import type { SolInstruction } from '$sol/types/sol-instructions';
import type { SplTokenAddress } from '$sol/types/spl';
import { isAtaAddress } from '$sol/utils/sol-address.utils';
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

/**
 * Fetches the SPL token balance for a wallet.
 */
export const loadSplTokenBalance = async ({
	address,
	network,
	tokenAddress,
	tokenOwnerAddress
}: {
	address: SolAddress;
	network: SolanaNetworkType;
	tokenAddress: SplTokenAddress;
	tokenOwnerAddress: SolAddress;
}): Promise<bigint> => {
	const isAta = await isAtaAddress({ address, network });

	const ataAddress: SolAddress = isAta
		? address
		: await calculateAssociatedTokenAddress({
				owner: address,
				tokenAddress,
				tokenOwnerAddress
			});

	const accountExists = await checkIfAccountExists({ address: ataAddress, network });

	if (!accountExists) {
		return 0n;
	}

	const balance = await loadTokenBalance({
		ataAddress,
		network
	});

	return balance ?? ZERO;
};
