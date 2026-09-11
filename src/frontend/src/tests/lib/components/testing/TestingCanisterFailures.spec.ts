import TestingCanisterFailures from '$lib/components/testing/TestingCanisterFailures.svelte';
import { simulatedFailuresStore } from '$lib/utils/simulated-canister-failures.utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('TestingCanisterFailures', () => {
	beforeEach(() => {
		simulatedFailuresStore.set({ indexSymbols: [], ledgerSymbols: [] });
	});

	const inputs = (container: HTMLElement) => ({
		index: container.querySelector<HTMLInputElement>('input[name="simulated-index-failures"]'),
		ledger: container.querySelector<HTMLInputElement>('input[name="simulated-ledger-failures"]')
	});

	it('should render an input for each canister kind and an apply button', () => {
		const { container, getByText } = render(TestingCanisterFailures);

		const { index, ledger } = inputs(container);

		expect(index).toBeInTheDocument();
		expect(ledger).toBeInTheDocument();
		expect(getByText('Apply')).toBeInTheDocument();
	});

	it('should store the symbols typed, upper-cased', async () => {
		const { container, getByText } = render(TestingCanisterFailures);

		const { index } = inputs(container);

		await fireEvent.input(index as HTMLInputElement, { target: { value: 'gldt, panda' } });
		await fireEvent.click(getByText('Apply'));

		await waitFor(() =>
			expect(get(simulatedFailuresStore)).toStrictEqual({
				indexSymbols: ['GLDT', 'PANDA'],
				ledgerSymbols: []
			})
		);
	});

	it('should tell the index and ledger fields apart', async () => {
		const { container, getByText } = render(TestingCanisterFailures);

		const { ledger } = inputs(container);

		await fireEvent.input(ledger as HTMLInputElement, { target: { value: 'GLDT' } });
		await fireEvent.click(getByText('Apply'));

		await waitFor(() =>
			expect(get(simulatedFailuresStore)).toStrictEqual({
				indexSymbols: [],
				ledgerSymbols: ['GLDT']
			})
		);
	});

	it('should clear the simulation when both fields are emptied', async () => {
		simulatedFailuresStore.set({ indexSymbols: ['GLDT'], ledgerSymbols: [] });

		const { container, getByText } = render(TestingCanisterFailures);

		const { index } = inputs(container);

		expect(index?.value).toBe('GLDT');

		await fireEvent.input(index as HTMLInputElement, { target: { value: '' } });
		await fireEvent.click(getByText('Apply'));

		await waitFor(() =>
			expect(get(simulatedFailuresStore)).toStrictEqual({ indexSymbols: [], ledgerSymbols: [] })
		);
	});

	it('should prefill the fields with what is currently simulated', () => {
		simulatedFailuresStore.set({ indexSymbols: ['PANDA'], ledgerSymbols: ['GLDT'] });

		const { container } = render(TestingCanisterFailures);

		const { index, ledger } = inputs(container);

		expect(index?.value).toBe('PANDA');
		expect(ledger?.value).toBe('GLDT');
	});
});
