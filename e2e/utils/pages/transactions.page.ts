import { TOKEN_CARD } from '$lib/constants/test-ids.constants';
import { HomepageLoggedIn, type HomepageLoggedInParams } from './homepage.page';

export type TransactionsPageParams = {
	tokenSymbol: string;
} & HomepageLoggedInParams;

export class TransactionsPage extends HomepageLoggedIn {
	readonly #tokenSymbol: string;

	constructor({ page, iiPage, viewportSize, tokenSymbol }: TransactionsPageParams) {
		super({ page, iiPage, viewportSize });

		this.#tokenSymbol = tokenSymbol;
	}

	override async extendWaitForReady(): Promise<void> {
		await this.clickByTestId(`${TOKEN_CARD}-${this.#tokenSymbol}`);
	}
}
