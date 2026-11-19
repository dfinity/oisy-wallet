import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import CyclesTopUpToken from '$icp/components/cycles-top-up/CyclesTopUpToken.svelte';
import type { IcToken } from '$icp/types/ic-token';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import {
	CYCLES_TOP_UP_TOKEN_ENABLE_BUTTON,
	CYCLES_TOP_UP_TOKEN_OPTION
} from '$lib/constants/test-ids.constants';
import * as authDerived from '$lib/derived/auth.derived';
import * as tokenServices from '$lib/services/token.services';
import { balancesStore } from '$lib/stores/balances.store';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockTcyclesToken } from '$tests/mocks/cycles-mint.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIcrcCustomToken } from '$tests/mocks/icrc-custom-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('CyclesTopUpToken', () => {
	const renderToken = ({
		tokens,
		onSelect = vi.fn(),
		onCancel = vi.fn()
	}: {
		tokens: IcToken[];
		onSelect?: (token: IcToken) => void;
		onCancel?: () => void;
	}) => render(CyclesTopUpToken, { props: { tokens, onSelect, onCancel } });

	beforeEach(() => {
		balancesStore.set({ id: ICP_TOKEN.id, data: { data: 150_000_000n, certified: true } });
		balancesStore.set({
			id: mockTcyclesToken.id,
			data: { data: 2_000_000_000_000n, certified: true }
		});
	});

	it('lists the tokens that can pay, with their balances, and picks one', async () => {
		const onSelect = vi.fn();

		const { getAllByTestId } = renderToken({ tokens: [ICP_TOKEN, mockTcyclesToken], onSelect });

		const options = getAllByTestId(CYCLES_TOP_UP_TOKEN_OPTION);

		expect(options).toHaveLength(2);
		expect(options[0]).toHaveTextContent(ICP_TOKEN.symbol);
		expect(options[0]).toHaveTextContent('1.5');
		expect(options[1]).toHaveTextContent(mockTcyclesToken.symbol);
		expect(options[1]).toHaveTextContent('2');

		const button = options[1].querySelector('button');

		assertNonNullish(button);

		await fireEvent.click(button);

		expect(onSelect).toHaveBeenCalledExactlyOnceWith(mockTcyclesToken);
	});

	it('cancels', async () => {
		const onCancel = vi.fn();

		const { getByText } = renderToken({ tokens: [ICP_TOKEN, mockTcyclesToken], onCancel });

		await fireEvent.click(getByText(en.core.text.cancel));

		expect(onCancel).toHaveBeenCalledOnce();
	});

	it('explains what a top-up is and how to pay for one when no token can pay, and only closes', async () => {
		const onCancel = vi.fn();

		const { container, getByText, queryByTestId } = renderToken({ tokens: [], onCancel });

		expect(container).toHaveTextContent(en.cycles_top_up.text.no_token_title);
		expect(container).toHaveTextContent(en.cycles_top_up.text.no_token_description);
		expect(queryByTestId(CYCLES_TOP_UP_TOKEN_OPTION)).toBeNull();

		await fireEvent.click(getByText(en.core.text.close));

		expect(onCancel).toHaveBeenCalledOnce();
	});

	it('shows a token that cannot pay and says why, with nothing to pick it by', () => {
		// Twice the TCYCLES fee: nothing above the fee is left to top up with.
		balancesStore.set({ id: mockTcyclesToken.id, data: { data: 200_000_000n, certified: true } });

		const { getAllByTestId } = renderToken({ tokens: [ICP_TOKEN, mockTcyclesToken] });

		const options = getAllByTestId(CYCLES_TOP_UP_TOKEN_OPTION);

		expect(options[0]).not.toHaveTextContent(en.cycles_top_up.text.not_enough_to_pay);
		expect(options[0].querySelector('button')).not.toBeNull();
		expect(options[1]).toHaveTextContent(mockTcyclesToken.symbol);
		expect(options[1]).toHaveTextContent('0.0002');
		expect(options[1]).toHaveTextContent(en.cycles_top_up.text.not_enough_to_pay);
		expect(options[1].querySelector('button')).toBeNull();
	});

	it('shows a token whose balance has not loaded without saying why or anything to pick it by', () => {
		balancesStore.reset(mockTcyclesToken.id);

		const { getAllByTestId } = renderToken({ tokens: [ICP_TOKEN, mockTcyclesToken] });

		const options = getAllByTestId(CYCLES_TOP_UP_TOKEN_OPTION);

		expect(options[1]).not.toHaveTextContent(en.cycles_top_up.text.not_enough_to_pay);
		expect(options[1].querySelector('button')).toBeNull();
	});

	describe('a token that is not enabled', () => {
		const disabled: IcrcCustomToken = {
			...mockIcrcCustomToken,
			...mockTcyclesToken,
			enabled: false
		};

		beforeEach(() => {
			vi.spyOn(authDerived, 'authIdentity', 'get').mockReturnValue(readable(mockIdentity));
		});

		it('offers Enable where its balance would be, as its only button', () => {
			const { getAllByTestId, getByTestId } = renderToken({ tokens: [ICP_TOKEN, disabled] });

			const options = getAllByTestId(CYCLES_TOP_UP_TOKEN_OPTION);

			expect(options[1]).toHaveTextContent(mockTcyclesToken.symbol);
			// No balance, as other lists hide it for a token that is not enabled.
			expect(options[1]).not.toHaveTextContent('2');

			const enable = getByTestId(CYCLES_TOP_UP_TOKEN_ENABLE_BUTTON);

			expect([...options[1].querySelectorAll('button')]).toEqual([enable]);
			expect(enable).toHaveTextContent(en.cycles_top_up.text.enable_token);
			expect(enable).toHaveAccessibleName(
				replacePlaceholders(en.cycles_top_up.alt.enable_token, { $token: mockTcyclesToken.symbol })
			);
		});

		it('enables it as the Swap enables a destination token', async () => {
			const enableSpy = vi
				.spyOn(tokenServices, 'autoLoadSingleToken')
				.mockResolvedValue({ result: 'loaded' });

			const { getByTestId } = renderToken({ tokens: [ICP_TOKEN, disabled] });

			await fireEvent.click(getByTestId(CYCLES_TOP_UP_TOKEN_ENABLE_BUTTON));

			expect(enableSpy).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				token: disabled,
				setToken: expect.any(Function),
				loadTokens: expect.any(Function),
				errorMessage: en.init.error.icrc_custom_token
			});
		});

		it('explains instead of listing when the other token cannot pay either', () => {
			balancesStore.set({ id: ICP_TOKEN.id, data: { data: 40_000n, certified: true } });

			const { container, queryByTestId } = renderToken({ tokens: [ICP_TOKEN, disabled] });

			expect(container).toHaveTextContent(en.cycles_top_up.text.no_token_title);
			expect(queryByTestId(CYCLES_TOP_UP_TOKEN_ENABLE_BUTTON)).toBeNull();
		});
	});

	it('explains instead of listing when every token is known not to pay', () => {
		balancesStore.set({ id: ICP_TOKEN.id, data: { data: 40_000n, certified: true } });
		balancesStore.set({ id: mockTcyclesToken.id, data: { data: 200_000_000n, certified: true } });

		const { container, queryByTestId } = renderToken({ tokens: [ICP_TOKEN, mockTcyclesToken] });

		expect(container).toHaveTextContent(en.cycles_top_up.text.no_token_title);
		expect(queryByTestId(CYCLES_TOP_UP_TOKEN_OPTION)).toBeNull();
	});
});
