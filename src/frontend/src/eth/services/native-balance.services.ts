import { SUPPORTED_EVM_TOKENS } from '$env/tokens/tokens-evm/tokens.evm.env';
import { SUPPORTED_ETHEREUM_TOKENS } from '$env/tokens/tokens.eth.env';
import { reloadEthereumBalance } from '$eth/services/eth-balance.services';
import type { NetworkId } from '$lib/types/network';
import type { RequiredToken, Token } from '$lib/types/token';
import { consoleError } from '$lib/utils/console.utils';
import { isNullish } from '@dfinity/utils';
import type { TransactionResponse } from 'ethers/providers';

// Read from the supported lists rather than from the enabled-tokens store: this is looked up from
// the NFT and ERC-4626 paths, whose own module graphs have no store in them, and a `derived` built
// at import time falls over in every test that mocks the stores it is built from. The network a
// transaction just ran on is enabled by definition, so the two lists agree wherever it matters.
const NATIVE_TOKENS: RequiredToken[] = [...SUPPORTED_ETHEREUM_TOKENS, ...SUPPORTED_EVM_TOKENS];

export const nativeTokenOf = (networkId: NetworkId): Token | undefined =>
	NATIVE_TOKENS.find(({ network: { id } }) => id === networkId);

/**
 * Reloads the balance the gas of a transaction was paid from, once that transaction is mined.
 *
 * For the paths that record a transaction, `processMinedTransaction` already does this. An NFT
 * transfer and an ERC-4626 deposit or withdrawal do not go through it: they broadcast and return.
 * Their gas is spent all the same, and `waitAndTriggerWallet` does not cover it, EVM balances
 * having no wallet worker to trigger. Without this, the native balance stays overstated until the
 * next poll, and a "Max" send priced against it reserves more than the account holds.
 *
 * Waits on the response the caller already holds rather than on a provider of its own: this module
 * is imported by paths that have no other reason to build one, and `eth-balance.services` is
 * imported by nearly everything.
 *
 * Best effort by design, and safe to leave un-awaited: a caller must not be held open until the
 * transaction is mined, and a balance that fails to reload is the same staleness the poll already
 * resolves on its own.
 */
export const reloadNativeBalanceOnMined = async ({
	transaction,
	networkId
}: {
	transaction: TransactionResponse;
	networkId: NetworkId;
}) => {
	const nativeToken = nativeTokenOf(networkId);

	if (isNullish(nativeToken)) {
		return;
	}

	try {
		await transaction.wait();

		await reloadEthereumBalance(nativeToken);
	} catch (err: unknown) {
		consoleError(err);
	}
};
