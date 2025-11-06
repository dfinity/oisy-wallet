import { GLDT_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import {
	GLDT_STAKE_CONTEXT_KEY,
	initGldtStakeStore,
	type GldtStakeContext
} from '$icp/stores/gldt-stake.store';
import UnstakeModal from '$lib/components/stake/UnstakeModal.svelte';
import { STAKE_FORM_REVIEW_BUTTON } from '$lib/constants/test-ids.constants';
import type { Token } from '$lib/types/token';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('UnstakeModal', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('should display correct modal title after navigating between steps', async () => {
		const { container, getByText, getByTestId } = render(UnstakeModal, {
			props: {
				token: {
					...mockValidIcrcToken,
					symbol: 'GLDT',
					ledgerCanisterId: GLDT_LEDGER_CANISTER_ID
				} as Token,
				totalStaked: 1000n
			},
			context: new Map<symbol, GldtStakeContext>([
				[GLDT_STAKE_CONTEXT_KEY, { store: initGldtStakeStore() }]
			])
		});

		const firstStepTitle = 'Unstake GLDT';

		expect(container).toHaveTextContent(firstStepTitle);

		await fireEvent.click(getByTestId(STAKE_FORM_REVIEW_BUTTON));

		expect(container).toHaveTextContent(en.stake.text.review);

		await fireEvent.click(getByText(en.core.text.back));

		expect(container).toHaveTextContent(firstStepTitle);
	});
});
