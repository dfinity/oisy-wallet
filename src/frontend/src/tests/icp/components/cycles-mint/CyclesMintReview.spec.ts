import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import CyclesMintReview from '$icp/components/cycles-mint/CyclesMintReview.svelte';
import { CYCLES_MINT_REVIEW_MINT_BUTTON } from '$lib/constants/test-ids.constants';
import { CONVERT_CONTEXT_KEY, initConvertContext } from '$lib/stores/convert.store';
import { mockTcyclesToken, mockXdrPermyriadPerIcp } from '$tests/mocks/cycles-mint.mock';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('CyclesMintReview', () => {
	const tooSmall = 'The amount is too small to mint TCYCLES.';

	const context = () =>
		new Map([
			[
				CONVERT_CONTEXT_KEY,
				initConvertContext({ sourceToken: ICP_TOKEN, destinationToken: mockTcyclesToken })
			]
		]);

	const props = (
		overrides: Partial<{
			sendAmount: string;
			xdrPermyriadPerIcp: bigint | undefined;
			requoting: boolean;
		}> = {}
	) => ({
		sendAmount: '1.5',
		xdrPermyriadPerIcp: mockXdrPermyriadPerIcp as bigint | undefined,
		onBack: vi.fn(),
		onMint: vi.fn(),
		...overrides
	});

	it('shows what is paid and minted, who mints, and the one-way notice', () => {
		const { container } = render(CyclesMintReview, { props: props(), context: context() });

		expect(container).toHaveTextContent(`${en.tokens.text.source_token_title} 1.5 ICP`);
		expect(container).toHaveTextContent(`${en.cycles_mint.text.you_mint_estimate} 6.7499 TCYCLES`);
		expect(container).toHaveTextContent('1 ICP ≈ 4.5 TCYCLES');
		expect(container).toHaveTextContent(`${en.cycles_mint.text.minter} Cycles Minting Canister`);
		expect(container).toHaveTextContent(
			'Minting cannot be undone: TCYCLES cannot be turned back into ICP.'
		);
	});

	it('mints', async () => {
		const testProps = props();

		const { getByTestId } = render(CyclesMintReview, { props: testProps, context: context() });

		await fireEvent.click(getByTestId(CYCLES_MINT_REVIEW_MINT_BUTTON));

		expect(testProps.onMint).toHaveBeenCalledOnce();
	});

	it('goes back', async () => {
		const testProps = props();

		const { getByText } = render(CyclesMintReview, { props: testProps, context: context() });

		await fireEvent.click(getByText(en.core.text.back));

		expect(testProps.onBack).toHaveBeenCalledOnce();
	});

	// Review checks the bound against the quote it opened with.
	it('cannot mint until its re-quote has come back', async () => {
		const testProps = props({ requoting: true });

		const { getByTestId, rerender } = render(CyclesMintReview, {
			props: testProps,
			context: context()
		});

		expect(getByTestId(CYCLES_MINT_REVIEW_MINT_BUTTON)).toBeDisabled();

		await rerender({ ...testProps, requoting: false });

		expect(getByTestId(CYCLES_MINT_REVIEW_MINT_BUTTON)).toBeEnabled();
	});

	it('cannot mint without a rate', () => {
		const { getByTestId } = render(CyclesMintReview, {
			props: props({ xdrPermyriadPerIcp: undefined }),
			context: context()
		});

		expect(getByTestId(CYCLES_MINT_REVIEW_MINT_BUTTON)).toBeDisabled();
	});

	// The modal re-quotes when Review opens and every minute after. At 0.5 TCYCLES per ICP,
	// 0.00035 ICP mints less than twice the deposit fee, which the form would have rejected.
	it('stops the mint, and says why, once a new quote puts the amount below the bound', async () => {
		const testProps = props({ sendAmount: '0.00035' });

		const { container, getByTestId, rerender } = render(CyclesMintReview, {
			props: testProps,
			context: context()
		});

		expect(getByTestId(CYCLES_MINT_REVIEW_MINT_BUTTON)).toBeEnabled();
		expect(container).not.toHaveTextContent(tooSmall);

		await rerender({ ...testProps, xdrPermyriadPerIcp: 5_000n });

		expect(getByTestId(CYCLES_MINT_REVIEW_MINT_BUTTON)).toBeDisabled();
		expect(container).toHaveTextContent(tooSmall);
	});

	it('mints at a quote that keeps the amount above the bound', () => {
		const { container, getByTestId } = render(CyclesMintReview, {
			props: props({ sendAmount: '0.00040001', xdrPermyriadPerIcp: 5_000n }),
			context: context()
		});

		expect(getByTestId(CYCLES_MINT_REVIEW_MINT_BUTTON)).toBeEnabled();
		expect(container).not.toHaveTextContent(tooSmall);
	});
});
