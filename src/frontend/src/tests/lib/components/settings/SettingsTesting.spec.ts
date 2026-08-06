import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import SettingsTesting from '$lib/components/settings/SettingsTesting.svelte';
import * as simulator from '$lib/utils/simulated-canister-failures.utils';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

describe('SettingsTesting', () => {
	const token: IcrcCustomToken = {
		...mockValidIcToken,
		symbol: 'GLDT',
		ledgerCanisterId: 'gldt-ledger',
		indexCanisterId: 'gldt-index',
		version: 1n,
		enabled: true
	};

	beforeEach(() => {
		vi.restoreAllMocks();

		icrcCustomTokensStore.resetAll();
		icrcCustomTokensStore.setAll([{ data: token, certified: true }]);

		vi.spyOn(simulator, 'getSimulatedCanisterFailures').mockResolvedValue({
			indexCanisterIds: [],
			ledgerCanisterIds: []
		});
	});

	const inputs = (container: HTMLElement) => ({
		index: container.querySelector<HTMLInputElement>('input[name="simulated-index-failures"]'),
		ledger: container.querySelector<HTMLInputElement>('input[name="simulated-ledger-failures"]')
	});

	it('should render an input for each canister kind and an apply button', () => {
		const { container, getByText } = render(SettingsTesting);

		const { index, ledger } = inputs(container);

		expect(index).toBeInTheDocument();
		expect(ledger).toBeInTheDocument();
		expect(getByText('Apply')).toBeInTheDocument();
	});

	it('should store the canister IDs resolved from the symbols', async () => {
		const spySet = vi.spyOn(simulator, 'setSimulatedCanisterFailures').mockResolvedValue();

		const { container, getByText } = render(SettingsTesting);

		const { index } = inputs(container);

		await fireEvent.input(index as HTMLInputElement, { target: { value: 'gldt' } });
		await fireEvent.click(getByText('Apply'));

		await waitFor(() =>
			expect(spySet).toHaveBeenCalledWith({
				indexCanisterIds: ['gldt-index'],
				ledgerCanisterIds: []
			})
		);
	});

	it('should store nothing when both fields are empty', async () => {
		const spySet = vi.spyOn(simulator, 'setSimulatedCanisterFailures').mockResolvedValue();

		const { getByText } = render(SettingsTesting);

		await fireEvent.click(getByText('Apply'));

		await waitFor(() =>
			expect(spySet).toHaveBeenCalledWith({ indexCanisterIds: [], ledgerCanisterIds: [] })
		);
	});

	it('should prefill the fields with what is currently simulated', async () => {
		vi.spyOn(simulator, 'getSimulatedCanisterFailures').mockResolvedValue({
			indexCanisterIds: ['gldt-index'],
			ledgerCanisterIds: []
		});

		const { container } = render(SettingsTesting);

		await waitFor(() => expect(inputs(container).index?.value).toBe('GLDT'));
	});
});
