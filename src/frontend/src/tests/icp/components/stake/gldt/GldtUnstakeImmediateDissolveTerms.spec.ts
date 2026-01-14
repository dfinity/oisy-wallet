import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import GldtUnstakeImmediateDissolveTerms from '$icp/components/stake/gldt/GldtUnstakeImmediateDissolveTerms.svelte';
import {
	GLDT_STAKE_CONTEXT_KEY,
	initGldtStakeStore,
	type GldtStakeContext
} from '$icp/stores/gldt-stake.store';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { stakePositionMockResponse } from '$tests/mocks/gldt_stake.mock';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('GldtUnstakeImmediateDissolveTerms', () => {
	const mockContext = () => {
		const store = initGldtStakeStore();
		store.setPosition(stakePositionMockResponse);

		return new Map<symbol, SendContext | GldtStakeContext>([
			[SEND_CONTEXT_KEY, initSendContext({ token: ICP_TOKEN })],
			[GLDT_STAKE_CONTEXT_KEY, { store }]
		]);
	};

	it('should display correct values', () => {
		const { container } = render(GldtUnstakeImmediateDissolveTerms, {
			props: { isReview: true },
			context: mockContext()
		});

		expect(container).toHaveTextContent(en.stake.text.immediate_dissolve);

		expect(container).toHaveTextContent(
			replacePlaceholders(en.stake.text.immediate_dissolve_terms, { $token: ICP_TOKEN.symbol })
		);
	});
});
