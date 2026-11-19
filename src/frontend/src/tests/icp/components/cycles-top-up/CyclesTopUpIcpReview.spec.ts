import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import CyclesTopUpIcpReview from '$icp/components/cycles-top-up/CyclesTopUpIcpReview.svelte';
import { CMC_NAME } from '$icp/constants/cmc.constants';
import {
	CYCLES_TOP_UP_ESTIMATE,
	CYCLES_TOP_UP_RATE,
	CYCLES_TOP_UP_REVIEW_BACK_BUTTON,
	CYCLES_TOP_UP_REVIEW_TOP_UP_BUTTON
} from '$lib/constants/test-ids.constants';
import { CONVERT_CONTEXT_KEY, initConvertContext } from '$lib/stores/convert.store';
import type { OptionAmount } from '$lib/types/send';
import { mockXdrPermyriadPerIcp } from '$tests/mocks/cycles-mint.mock';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('CyclesTopUpIcpReview', () => {
	const canisterId = 'ywcsb-maaaa-aaaai-q6k7a-cai';

	const context = () =>
		new Map<symbol, unknown>([
			[
				CONVERT_CONTEXT_KEY,
				initConvertContext({ sourceToken: ICP_TOKEN, destinationToken: ICP_TOKEN })
			]
		]);

	const props = (
		overrides: Partial<{
			sendAmount: OptionAmount;
			xdrPermyriadPerIcp: bigint | undefined;
			requoting: boolean;
		}> = {}
	) => ({
		canisterId,
		sendAmount: '1.5' as OptionAmount,
		xdrPermyriadPerIcp: mockXdrPermyriadPerIcp as bigint | undefined,
		onBack: vi.fn(),
		onTopUp: vi.fn(),
		...overrides
	});

	const renderReview = (testProps = props()) =>
		render(CyclesTopUpIcpReview, { props: testProps, context: context() });

	it('shows the canister in full, the cycles, the rate, the fee, the total and who converts', () => {
		const { container, getByTestId } = renderReview();

		expect(container).toHaveTextContent(canisterId);
		expect(getByTestId(CYCLES_TOP_UP_ESTIMATE)).toHaveTextContent('≈ 6.75T cycles');
		expect(getByTestId(CYCLES_TOP_UP_RATE)).toHaveTextContent('1 ICP ≈ 4.5T cycles');
		expect(container).toHaveTextContent(en.fee.text.network_fee);
		expect(container).toHaveTextContent(`${en.cycles_top_up.text.total} 1.5001 ICP`);
		expect(container).toHaveTextContent(`${en.cycles_top_up.text.converted_by} ${CMC_NAME}`);
		expect(container).toHaveTextContent(
			'A top-up cannot be undone: the cycles stay in the canister and cannot be turned back into ICP.'
		);
	});

	it('tops up and goes back', async () => {
		const testProps = props();

		const { getByTestId } = renderReview(testProps);

		await fireEvent.click(getByTestId(CYCLES_TOP_UP_REVIEW_TOP_UP_BUTTON));

		expect(testProps.onTopUp).toHaveBeenCalledOnce();

		await fireEvent.click(getByTestId(CYCLES_TOP_UP_REVIEW_BACK_BUTTON));

		expect(testProps.onBack).toHaveBeenCalledOnce();
	});

	it('waits for the quote it opened with', () => {
		const { getByTestId } = renderReview(props({ requoting: true }));

		expect(getByTestId(CYCLES_TOP_UP_REVIEW_TOP_UP_BUTTON)).toBeDisabled();
	});

	it.each([
		{ label: 'without a rate', overrides: { xdrPermyriadPerIcp: undefined } },
		{ label: 'without an amount', overrides: { sendAmount: undefined } }
	])('cannot top up $label', ({ overrides }) => {
		const { getByTestId } = renderReview(props(overrides));

		expect(getByTestId(CYCLES_TOP_UP_REVIEW_TOP_UP_BUTTON)).toBeDisabled();
	});
});
