import CyclesTopUpProgress from '$icp/components/cycles-top-up/CyclesTopUpProgress.svelte';
import { ProgressStepsCyclesTopUp } from '$lib/enums/progress-steps';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('CyclesTopUpProgress', () => {
	const canisterId = 'ywcsb-maaaa-aaaai-q6k7a-cai';

	const sending = 'Sending ICP to the Cycles Minting Canister...';

	it('tops the canister up in one step with TCYCLES', () => {
		const { container } = render(CyclesTopUpProgress, {
			props: { canisterId, progressStep: ProgressStepsCyclesTopUp.TOP_UP }
		});

		expect(container).toHaveTextContent(en.send.text.initializing);
		expect(container).toHaveTextContent(
			`Topping up ${shortenWithMiddleEllipsis({ text: canisterId })}...`
		);
		expect(container).not.toHaveTextContent(sending);
	});

	it('sends the ICP to the CMC before the top-up when paid with ICP', () => {
		const { container } = render(CyclesTopUpProgress, {
			props: { canisterId, progressStep: ProgressStepsCyclesTopUp.TRANSFER, paidWithIcp: true }
		});

		expect(container).toHaveTextContent(sending);
		expect(container).toHaveTextContent(
			`Topping up ${shortenWithMiddleEllipsis({ text: canisterId })}...`
		);
	});
});
