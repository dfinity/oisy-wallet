import { modalStore } from '$lib/stores/modal.store';
import { nonNullish } from '@dfinity/utils';

export const closeModal = (reset: () => void) => {
	modalStore.close();

	// The modal closes in 200ms. We defer the reset until after to avoid showing any changes while the modal is closing, which can be glitchy.
	setTimeout(() => reset(), 250);
};

const symbols: Record<string, symbol> = {};

export const getSymbol = (identifier: string) =>
	nonNullish(symbols[identifier])
		? symbols[identifier]
		: (symbols[identifier] = Symbol(identifier));
