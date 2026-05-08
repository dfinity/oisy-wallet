import type { ContactUi } from '$lib/types/contact';
import type { Token } from '$lib/types/token';
import type { AllTransactionUiWithCmp } from '$lib/types/transaction-ui';
import type { TransactionsFilter } from '$lib/types/transactions-filter';
import { filterAddressFromContact } from '$lib/utils/contact.utils';
import { assertNever, isNullish, nonNullish, notEmptyString } from '@dfinity/utils';

/**
 * Stable key for activity token filters. Token `id.description` alone is not
 * unique across networks (e.g. native ETH reuses `Symbol('ETH')` on Ethereum
 * and Base); pairing with the network id matches list rows and transactions.
 */
export const transactionsFilterTokenKey = ({id, network:{id:networkId}}: Token): string | undefined => {
	const tokenDesc = id.description;
	const networkDesc = networkId.description;

	if (isNullish(tokenDesc) || isNullish(networkDesc)) {
		return;
	}

	return `${tokenDesc}-${networkDesc}`;
};

const candidateAddresses = (transactionUi: AllTransactionUiWithCmp): string[] => {
	const collected: (string | undefined)[] = [];

	if (transactionUi.component === 'bitcoin') {
		const { transaction } = transactionUi;
		collected.push(transaction.from);
		if (nonNullish(transaction.to)) {
			collected.push(...transaction.to);
		}
	} else if (transactionUi.component === 'ethereum') {
		const { transaction } = transactionUi;
		collected.push(transaction.from);
		const { to } = transaction;
		if (typeof to === 'string') {
			collected.push(to);
		}
	} else if (transactionUi.component === 'ic') {
		const { transaction } = transactionUi;
		collected.push(transaction.from);
		collected.push(transaction.to);
	} else if (transactionUi.component === 'solana') {
		// Solana — prefer the owner (the wallet-level address) over the SPL
		// token-account (ATA), matching what TransactionContactCard resolves
		// against today.
		const { transaction } = transactionUi;
		collected.push(transaction.fromOwner ?? transaction.from);
		collected.push(transaction.toOwner ?? transaction.to);
	} else {
		assertNever(
			transactionUi,
			`Unexpected transaction component: ${JSON.stringify(transactionUi)}`
		);
	}

	return collected.filter((address): address is string => notEmptyString(address));
};

const matchesContact = ({
	transactionUi,
	contacts
}: {
	transactionUi: AllTransactionUiWithCmp;
	contacts: ContactUi[];
}): boolean => {
	const addresses = candidateAddresses(transactionUi);

	if (addresses.length === 0) {
		return false;
	}

	return contacts.some((contact) =>
		addresses.some((address) => nonNullish(filterAddressFromContact({ contact, address })))
	);
};

export const applyTransactionsFilter = ({
	transactions,
	filter,
	contacts
}: {
	transactions: AllTransactionUiWithCmp[];
	filter: TransactionsFilter;
	contacts: ContactUi[];
}): AllTransactionUiWithCmp[] => {
	const { types, tokenIds, contactIds } = filter;

	const hasTypeFilter = types.length > 0;
	const hasTokenFilter = tokenIds.length > 0;
	const hasContactFilter = contactIds.length > 0;

	if (!hasTypeFilter && !hasTokenFilter && !hasContactFilter) {
		return transactions;
	}

	const typeSet = new Set(types);
	const tokenSet = new Set(tokenIds);
	const contactIdSet = new Set(contactIds);

	const selectedContacts = hasContactFilter
		? contacts.filter(({ id }) => contactIdSet.has(id.toString()))
		: [];

	return transactions.filter((transactionUi) => {
		if (hasTypeFilter && !typeSet.has(transactionUi.transaction.type)) {
			return false;
		}

		if (hasTokenFilter) {
			const tokenKey = transactionsFilterTokenKey(transactionUi.token);
			if (isNullish(tokenKey) || !tokenSet.has(tokenKey)) {
				return false;
			}
		}

		if (hasContactFilter && !matchesContact({ transactionUi, contacts: selectedContacts })) {
			return false;
		}

		return true;
	});
};
