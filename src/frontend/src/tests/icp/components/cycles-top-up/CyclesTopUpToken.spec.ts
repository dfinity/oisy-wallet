import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import CyclesTopUpToken from '$icp/components/cycles-top-up/CyclesTopUpToken.svelte';
import type { IcToken } from '$icp/types/ic-token';
import { CYCLES_TOP_UP_TOKEN_OPTION } from '$lib/constants/test-ids.constants';
import { balancesStore } from '$lib/stores/balances.store';
import { mockTcyclesToken } from '$tests/mocks/cycles-mint.mock';
import en from '$tests/mocks/i18n.mock';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render } from '@testing-library/svelte';

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
});
