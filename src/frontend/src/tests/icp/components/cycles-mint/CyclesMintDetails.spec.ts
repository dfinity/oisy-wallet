import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import CyclesMintDetails from '$icp/components/cycles-mint/CyclesMintDetails.svelte';
import { CYCLES_MINT_RATE } from '$lib/constants/test-ids.constants';
import { CONVERT_CONTEXT_KEY, initConvertContext } from '$lib/stores/convert.store';
import { mockTcyclesToken, mockXdrPermyriadPerIcp } from '$tests/mocks/cycles-mint.mock';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('CyclesMintDetails', () => {
	const context = () =>
		new Map([
			[
				CONVERT_CONTEXT_KEY,
				initConvertContext({ sourceToken: ICP_TOKEN, destinationToken: mockTcyclesToken })
			]
		]);

	it('shows the rate and both fees', () => {
		const { container, getByTestId } = render(CyclesMintDetails, {
			props: { xdrPermyriadPerIcp: mockXdrPermyriadPerIcp },
			context: context()
		});

		expect(getByTestId(CYCLES_MINT_RATE)).toHaveTextContent('1 ICP ≈ 4.5 TCYCLES');
		expect(container).toHaveTextContent(en.fee.text.network_fee);
		expect(container).toHaveTextContent('0.0001 ICP');
		expect(container).toHaveTextContent(en.cycles_mint.text.cycles_ledger_fee);
		expect(container).toHaveTextContent('0.0001 TCYCLES');
	});

	it('shows no rate until it has loaded', () => {
		const { queryByTestId } = render(CyclesMintDetails, { props: {}, context: context() });

		expect(queryByTestId(CYCLES_MINT_RATE)).not.toBeInTheDocument();
	});

	it('names the minter only when asked to', () => {
		const { container, rerender } = render(CyclesMintDetails, {
			props: { xdrPermyriadPerIcp: mockXdrPermyriadPerIcp },
			context: context()
		});

		expect(container).not.toHaveTextContent('Cycles Minting Canister');

		rerender({ xdrPermyriadPerIcp: mockXdrPermyriadPerIcp, showMinter: true });

		expect(container).toHaveTextContent(`${en.cycles_mint.text.minter} Cycles Minting Canister`);
	});
});
