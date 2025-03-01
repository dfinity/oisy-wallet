import { TOKEN_CARD } from '$lib/constants/test-ids.constants';
import { HomepageLoggedIn, type HomepageLoggedInParams } from './homepage.page';

export type TransactionsPageParams = {
	tokenSymbol: string;
	networkId: string;
} & HomepageLoggedInParams;

export class TransactionsPage extends HomepageLoggedIn {
	readonly #tokenSymbol: string;
	readonly #networkId: string;

	constructor({ page, iiPage, viewportSize, tokenSymbol, networkId }: TransactionsPageParams) {
		super({ page, iiPage, viewportSize });

		this.#tokenSymbol = tokenSymbol;
		this.#networkId = networkId;
	}

	override async extendWaitForReady(): Promise<void> {
		const testId = `${TOKEN_CARD}-${this.#tokenSymbol}-${this.#networkId}`;
		await this.clickByTestId({ testId });
		await this.waitForLoadState();
	}
}
