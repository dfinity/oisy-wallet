import {
	MANAGE_TOKENS_MODAL,
	MANAGE_TOKENS_MODAL_BUTTON,
	MANAGE_TOKENS_MODAL_CONTRACT_ADDRESS_INPUT,
	MANAGE_TOKENS_MODAL_IMPORT_BUTTON,
	MANAGE_TOKENS_MODAL_NETWORK_SELECT,
	MANAGE_TOKENS_MODAL_NEXT_BUTTON,
	TOKEN_MODAL_INDEX_CANISTER_ID_INPUT,
	TOKEN_MODAL_LEDGER_CANISTER_ID_INPUT
} from '$lib/constants/test-ids.constants';
import en from '$lib/i18n/en.json' with { type: 'json' };
import { nonNullish } from '@dfinity/utils';
import { expect, type Locator } from '@playwright/test';
import { HomepageLoggedIn, type HomepageLoggedInParams } from './homepage.page';

type ImportTokenPageParams = HomepageLoggedInParams;

// `Toast.svelte` hardcodes its test IDs instead of consuming
// `$lib/constants/test-ids.constants`, so the e2e side mirrors the literal.
const TOAST_MESSAGE = 'toast-message';

// The review step validates against the local replica (ledger metadata, index
// `ledger_id`, balances) before it renders anything, so the default 5s
// `expect` timeout is not enough on a loaded shard.
const VALIDATION_TIMEOUT = 30_000;

export const IMPORT_TOKEN_ICP_NETWORK_NAME = 'Internet Computer';
export const IMPORT_TOKEN_ETHEREUM_NETWORK_NAME = 'Ethereum';

export class ImportTokenPage extends HomepageLoggedIn {
	constructor(params: ImportTokenPageParams) {
		super(params);
	}

	#getModalLocator(): Locator {
		return this.getLocatorByTestId({ testId: MANAGE_TOKENS_MODAL });
	}

	openImportForm = async ({ networkName }: { networkName: string }): Promise<void> => {
		await this.waitForModal({
			modalOpenButtonTestId: MANAGE_TOKENS_MODAL_BUTTON,
			modalTestId: MANAGE_TOKENS_MODAL
		});

		await this.clickByTestId({ testId: MANAGE_TOKENS_MODAL_IMPORT_BUTTON });

		await this.getLocatorByTestId({ testId: MANAGE_TOKENS_MODAL_NETWORK_SELECT }).selectOption(
			networkName
		);
	};

	submitIcrcToken = async ({
		ledgerCanisterId,
		indexCanisterId
	}: {
		ledgerCanisterId: string;
		indexCanisterId?: string;
	}): Promise<void> => {
		await this.setInputValueByTestId({
			testId: TOKEN_MODAL_LEDGER_CANISTER_ID_INPUT,
			value: ledgerCanisterId
		});

		if (nonNullish(indexCanisterId)) {
			await this.setInputValueByTestId({
				testId: TOKEN_MODAL_INDEX_CANISTER_ID_INPUT,
				value: indexCanisterId
			});
		}

		await this.clickByTestId({ testId: MANAGE_TOKENS_MODAL_NEXT_BUTTON });
	};

	submitErc20Token = async ({ contractAddress }: { contractAddress: string }): Promise<void> => {
		await this.setInputValueByTestId({
			testId: MANAGE_TOKENS_MODAL_CONTRACT_ADDRESS_INPUT,
			value: contractAddress
		});

		await this.clickByTestId({ testId: MANAGE_TOKENS_MODAL_NEXT_BUTTON });
	};

	expectImportRejected = async ({ errorMessage }: { errorMessage: string }): Promise<void> => {
		await expect(this.getLocatorByTestId({ testId: TOAST_MESSAGE }).first()).toContainText(
			errorMessage,
			{ timeout: VALIDATION_TIMEOUT }
		);

		// A rejected import sends the wizard back to the form with the values kept,
		// so the user can correct them without retyping.
		await expect(
			this.getLocatorByTestId({ testId: MANAGE_TOKENS_MODAL_NEXT_BUTTON })
		).toBeVisible();
	};

	expectImportReviewed = async ({
		ledgerCanisterId,
		indexCanisterId
	}: {
		ledgerCanisterId: string;
		indexCanisterId?: string;
	}): Promise<void> => {
		const modal = this.#getModalLocator();

		await expect(
			modal.getByRole('button', { name: en.tokens.import.text.add_the_token })
		).toBeEnabled({ timeout: VALIDATION_TIMEOUT });

		await expect(modal.getByText(ledgerCanisterId, { exact: true })).toBeVisible();

		const indexCanisterIdLabel = modal.getByText(en.tokens.import.text.index_canister_id, {
			exact: true
		});

		if (nonNullish(indexCanisterId)) {
			await expect(indexCanisterIdLabel).toBeVisible();
			await expect(modal.getByText(indexCanisterId, { exact: true })).toBeVisible();

			return;
		}

		await expect(indexCanisterIdLabel).toBeHidden();
	};
}
