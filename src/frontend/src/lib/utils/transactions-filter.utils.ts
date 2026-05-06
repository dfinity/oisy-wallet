import type { ContactUi } from '$lib/types/contact';
import type { AllTransactionUiWithCmp } from '$lib/types/transaction-ui';
import type { TransactionsFilter } from '$lib/types/transactions-filter';
import { filterAddressFromContact } from '$lib/utils/contact.utils';
import { isNullish, nonNullish, notEmptyString } from '@dfinity/utils';

const candidateAddresses = (transactionUi: AllTransactionUiWithCmp): string[] => {
	const { component, transaction } = transactionUi;

	const collected: (string | undefined)[] = [];

	if (component === 'bitcoin') {
		collected.push(transaction.from);
		if (nonNullish(transaction.to)) {
			collected.push(...transaction.to);
		}
	} else if (component === 'ethereum') {
		collected.push(transaction.from);
		const { to } = transaction;
		if (typeof to === 'string') {
			collected.push(to);
		}
	} else if (component === 'ic') {
		collected.push(transaction.from);
		collected.push(transaction.to);
	} else {
		// solana — prefer owners (the wallet-level address), fall back to token accounts
		collected.push(transaction.fromOwner ?? transaction.from);
		collected.push(transaction.toOwner ?? transaction.to);
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
			const tokenKey = transactionUi.token.id.description;
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
