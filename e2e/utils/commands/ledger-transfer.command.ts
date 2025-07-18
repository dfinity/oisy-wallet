import type { Command } from './runner';

interface LedgerTransferCommandParams {
	amount: string;
	recipient: string | undefined;
	memo?: number;
}

export class LedgerTransferCommand implements Command {
	readonly #amount: string;
	readonly #recipient: string | undefined;
	readonly #memo: number;

	constructor({ amount, recipient, memo = 0 }: LedgerTransferCommandParams) {
		this.#amount = amount;
		this.#recipient = recipient;
		this.#memo = memo;
	}

	toString(): string {
		return `dfx ledger transfer --memo ${this.#memo} --amount ${this.#amount} ${this.#recipient}`;
	}
}
