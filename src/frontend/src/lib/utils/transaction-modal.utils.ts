import type { OpenTransactionParams } from '$lib/stores/modal.store';
import type { AnyTransactionUi } from '$lib/types/transaction-ui';
import type { Token } from '$lib/types/token';

interface CreateOpenTransactionModalParams<T extends AnyTransactionUi> {
	openModal: (params: { id: symbol; data: OpenTransactionParams<T> }) => void;
	transaction: T;
	token: Token;
}

export const createOpenTransactionModal = <T extends AnyTransactionUi>({
	openModal,
	transaction,
	token
}: CreateOpenTransactionModalParams<T>): (() => void) => {
	const id = Symbol();

	return () => openModal({ id, data: { transaction, token } });
};
