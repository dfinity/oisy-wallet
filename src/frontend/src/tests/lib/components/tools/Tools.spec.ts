import * as canisterTopUpEnv from '$env/canister-top-up.env';
import Tools from '$lib/components/tools/Tools.svelte';
import { TOOLS_CANISTER_TOP_UP_BUTTON } from '$lib/constants/test-ids.constants';
import { modalStore } from '$lib/stores/modal.store';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('Tools', () => {
	const enableCanisterTopUp = (enabled: boolean) =>
		vi.spyOn(canisterTopUpEnv, 'CANISTER_TOP_UP_ENABLED', 'get').mockReturnValue(enabled);

	beforeEach(() => {
		vi.clearAllMocks();

		modalStore.close();
	});

	describe('Canister top-up', () => {
		it('offers to top up a canister', () => {
			enableCanisterTopUp(true);

			const { container, getByTestId } = render(Tools);

			expect(container).toHaveTextContent(en.cycles_top_up.text.canister_top_up);
			expect(container).toHaveTextContent(en.tools.text.top_up_canister);

			const button = getByTestId(TOOLS_CANISTER_TOP_UP_BUTTON);

			expect(button).toHaveTextContent(en.cycles_top_up.text.top_up);
			expect(button).toHaveAttribute('aria-label', en.tools.text.top_up_canister);
		});

		it('opens the Canister top-up modal', async () => {
			enableCanisterTopUp(true);

			const { getByTestId } = render(Tools);

			await fireEvent.click(getByTestId(TOOLS_CANISTER_TOP_UP_BUTTON));

			expect(get(modalStore)?.type).toBe('canister-top-up');
		});

		it('is absent while its flag is off', () => {
			enableCanisterTopUp(false);

			const { container, queryByTestId } = render(Tools);

			expect(queryByTestId(TOOLS_CANISTER_TOP_UP_BUTTON)).toBeNull();
			expect(container).not.toHaveTextContent(en.cycles_top_up.text.canister_top_up);
		});
	});

	it('offers Export data while the Canister top-up flag is off', () => {
		enableCanisterTopUp(false);

		const { getAllByText, getByText } = render(Tools);

		expect(getByText(en.settings.text.export_data)).toBeInTheDocument();
		expect(getAllByText(en.settings.text.export_tokens)).toHaveLength(2);
		expect(getAllByText(en.settings.text.export_transactions)).toHaveLength(2);
	});
});
