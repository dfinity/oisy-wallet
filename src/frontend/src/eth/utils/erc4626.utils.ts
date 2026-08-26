import type { Erc4626Token } from '$eth/types/erc4626';
import type { Erc4626CustomToken } from '$eth/types/erc4626-custom-token';
import { ZERO_ETH_ADDRESS } from '$lib/constants/app.constants';
import type { Token } from '$lib/types/token';
import type { Transaction } from '$lib/types/transaction';
import { isTokenToggleable } from '$lib/utils/token-toggleable.utils';

export const isTokenErc4626 = (token: Token): token is Erc4626Token =>
	token.standard.code === 'erc4626';

export const isTokenErc4626CustomToken = (token: Token): token is Erc4626CustomToken =>
	isTokenErc4626(token) && isTokenToggleable(token);

/**
 * Presents an ERC4626 vault's share mints and burns as transfers with the vault itself.
 *
 * Vaults emit standard ERC20 `Transfer` events against the zero address for supply changes —
 * `Transfer(0x0, user)` on deposit, `Transfer(user, 0x0)` on redeem — and Etherscan's `tokentx`
 * reports the event's from/to, not the signer. Showing `0x0` as the counterparty would describe a
 * deposit as coming from nowhere, so the zero address reads as the vault instead.
 *
 * A presentation convention only: on-chain, the counterparty is still the zero address. Applied
 * wherever vault transfers enter the transaction store, since rows arrive from Etherscan and from
 * stored history alike. Idempotent, so a row that has already been through it is unaffected.
 */
export const normalizeErc4626MintBurnTransfers = ({
	transactions,
	vaultAddress
}: {
	transactions: Transaction[];
	vaultAddress: string;
}): Transaction[] =>
	transactions.map((transaction) => {
		const isMint = transaction.from.toLowerCase() === ZERO_ETH_ADDRESS;
		const isBurn = transaction.to?.toLowerCase() === ZERO_ETH_ADDRESS;

		return {
			...transaction,
			...(isMint ? { from: vaultAddress } : {}),
			...(isBurn ? { to: vaultAddress } : {})
		};
	});
