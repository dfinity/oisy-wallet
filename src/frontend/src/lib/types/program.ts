/**
 * A program a transaction ran through, named for the user.
 *
 * A Solana program carries no name on chain: the account holds executable code and nothing that
 * says whose it is. So a name and an icon can only come from a list we curate, keyed by the one
 * thing the transaction does state, which is the address.
 */
export interface ProgramUi {
	address: string;
	name: string;
	icon: string;
}
