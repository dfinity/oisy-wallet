import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import SolWalletConnectSimulationPreview from '$sol/components/wallet-connect/SolWalletConnectSimulationPreview.svelte';
import type { SolSimulationPreview } from '$sol/types/sol-simulation';
import en from '$tests/mocks/i18n.mock';
import { mockAtaAddress, mockSolAddress2, mockSplAddress } from '$tests/mocks/sol.mock';
import { render } from '@testing-library/svelte';

describe('SolWalletConnectSimulationPreview', () => {
	const props = (preview: SolSimulationPreview) => ({
		preview,
		feeToken: SOLANA_TOKEN
	});

	it('should render an outgoing SOL delta as a negative amount', () => {
		const { getByTestId } = render(
			SolWalletConnectSimulationPreview,
			props({ solDelta: -10_000_000n, tokenDeltas: [], controlChanges: [] })
		);

		expect(getByTestId('simulated-sol-delta')).toHaveTextContent('-0.01 SOL');
	});

	it('should render an incoming token delta as a positive amount', () => {
		const { getByTestId } = render(
			SolWalletConnectSimulationPreview,
			props({
				tokenDeltas: [
					{ account: mockAtaAddress, tokenAddress: mockSplAddress, decimals: 6, delta: 2_500_000n }
				],
				controlChanges: []
			})
		);

		expect(getByTestId('simulated-token-delta')).toHaveTextContent('+2.5');
	});

	// An authority change moves nothing, so it has to be named in its own right or it is invisible.
	it('should warn about a control change even with no amounts at all', () => {
		const { getByText, getByTestId } = render(
			SolWalletConnectSimulationPreview,
			props({
				tokenDeltas: [],
				controlChanges: [{ account: mockAtaAddress, field: 'owner', to: mockSolAddress2 }]
			})
		);

		expect(getByText(en.wallet_connect.text.simulation_control_change)).toBeInTheDocument();
		expect(getByTestId('simulated-control-change')).toHaveTextContent(mockSolAddress2);
	});

	it('should not warn when nothing about control changed', () => {
		const { queryByText } = render(
			SolWalletConnectSimulationPreview,
			props({ solDelta: -5_000n, tokenDeltas: [], controlChanges: [] })
		);

		expect(queryByText(en.wallet_connect.text.simulation_control_change)).not.toBeInTheDocument();
	});

	it('should always state that the real execution can differ', () => {
		const { getByText } = render(
			SolWalletConnectSimulationPreview,
			props({ tokenDeltas: [], controlChanges: [] })
		);

		expect(getByText(en.wallet_connect.text.simulation_note)).toBeInTheDocument();
	});
});
