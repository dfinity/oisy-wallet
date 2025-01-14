import { TOKEN_CARD } from '$lib/constants/test-ids.constants';
import type { NetworkId } from '$lib/types/network';
import { HomepageLoggedIn, type HomepageLoggedInParams } from './homepage.page';

export type TransactionsPageParams = {
	tokenSymbol: string;
	networkId: NetworkId;
} & HomepageLoggedInParams;

export class TransactionsPage extends HomepageLoggedIn {
	readonly #tokenSymbol: string;
	readonly #networkId: NetworkId;

	constructor({ page, iiPage, viewportSize, tokenSymbol, networkId }: TransactionsPageParams) {
		super({ page, iiPage, viewportSize });

		this.#tokenSymbol = tokenSymbol;
		this.#networkId = networkId;
	}

	override async extendWaitForReady(): Promise<void> {
		await this.clickByTestId(`${TOKEN_CARD}-${this.#tokenSymbol}-${this.#networkId.description}`);
		await this.waitForLoadState();
	}
}
