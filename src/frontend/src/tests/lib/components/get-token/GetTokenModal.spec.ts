import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import * as kongBackendApi from '$lib/api/kong_backend.api';
import GetTokenModal from '$lib/components/get-token/GetTokenModal.svelte';
import {
	GET_TOKEN_MODAL_OPEN_SWAP_BUTTON,
	SWAP_SWITCH_TOKENS_BUTTON
} from '$lib/constants/test-ids.constants';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockKongBackendTokens } from '$tests/mocks/kong_backend.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

describe('GetTokenModal', () => {
	const renderGetTokenModal = () =>
		render(GetTokenModal, {
			props: {
				token: ICP_TOKEN,
				currentApy: 10
			}
		});

	it('should display GET_TOKEN step', () => {
		const { getByText } = renderGetTokenModal();

		expect(
			getByText(
				replacePlaceholders(en.stake.text.get_tokens, {
					$token_symbol: ICP_TOKEN.symbol
				})
			)
		).toBeInTheDocument();
	});

	it('should display Swap wizard steps', async () => {
		const { getByTestId } = renderGetTokenModal();
		mockAuthStore();
		vi.spyOn(kongBackendApi, 'kongTokens').mockResolvedValue(mockKongBackendTokens);

		await fireEvent.click(getByTestId(GET_TOKEN_MODAL_OPEN_SWAP_BUTTON));

		await waitFor(() => {
			expect(getByTestId(SWAP_SWITCH_TOKENS_BUTTON)).toBeInTheDocument();
		});
	});
});
