import { balancesStore } from '$lib/stores/balances.store';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { CertifiedTransaction } from '$lib/stores/transactions.store';
import type { SolAddress } from '$lib/types/address';
import type { CertifiedData } from '$lib/types/store';
import type { Token, TokenId } from '$lib/types/token';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import type {
	SolPostMessageDataResponseWallet,
	SolPostMessageDataResponseWalletTransactions
} from '$sol/types/sol-post-message';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import { isTokenSpl } from '$sol/utils/spl.utils';
import { jsonReviver, nonNullish } from '@dfinity/utils';
import { findAssociatedTokenPda } from '@solana-program/token';
import { address as solAddress } from '@solana/kit';
import { get } from 'svelte/store';

export const syncWallet = ({
	data,
	tokenId
}: {
	data: SolPostMessageDataResponseWallet;
	tokenId: TokenId;
}) => {
	const {
		wallet: {
			balance: { certified, data: balance }
		}
	} = data;

	if (nonNullish(balance)) {
		balancesStore.set({
			tokenId,
			data: {
				data: balance,
				certified
			}
		});
	} else {
		balancesStore.reset(tokenId);
	}
};

export const syncWalletError = ({
	tokenId,
	error: err,
	hideToast = false
}: {
	tokenId: TokenId;
	error: unknown;
	hideToast?: boolean;
}) => {
	const errorText = get(i18n).init.error.sol_wallet_error;

	balancesStore.reset(tokenId);

	if (hideToast) {
		console.warn(`${errorText}:`, err);
		return;
	}

	toastsError({
		msg: { text: errorText },
		err
	});
};

export const syncWalletTransactions = async ({
	data,
	address,
	tokens
}: {
	data: SolPostMessageDataResponseWalletTransactions;
	address: CertifiedData<SolAddress>;
	tokens: Token[];
}) => {
	const {
		wallet: { newTransactions }
	} = data;

	const { data: walletAddress } = address;

	const transactions: CertifiedTransaction<SolTransactionUi>[] = JSON.parse(
		newTransactions,
		jsonReviver
	);

	const transactionsMap: Record<TokenId, CertifiedTransaction<SolTransactionUi>[]> =
		await tokens.reduce<Promise<Record<TokenId, CertifiedTransaction<SolTransactionUi>[]>>>(
			async (acc, token) => {
				const [relevantAddress] = isTokenSpl(token)
					? await findAssociatedTokenPda({
							owner: solAddress(walletAddress),
							tokenProgram: solAddress(token.owner),
							mint: solAddress(token.address)
						})
					: [walletAddress];

				const { id: tokenId } = token;

				const tokenTransactions = transactions.filter(
					({ data: { from, to } }) => from === relevantAddress || to === relevantAddress
				);

				return {
					...acc,
					[tokenId]: tokenTransactions
				};
			},
			Promise.resolve({})
		);

	Object.getOwnPropertySymbols(transactionsMap).forEach((id) => {
		solTransactionsStore.prepend({
			tokenId: id as TokenId,
			transactions: transactionsMap[id as TokenId]
		});
	});
};

export const syncWalletTransactionsError = ({
	error: err,
	hideToast = false
}: {
	error: unknown;
	hideToast?: boolean;
}) => {
	const errorText = get(i18n).init.error.sol_wallet_error;

	solTransactionsStore.resetAll();

	if (hideToast) {
		console.warn(`${errorText}:`, err);
		return;
	}

	toastsError({
		msg: { text: errorText },
		err
	});
};
