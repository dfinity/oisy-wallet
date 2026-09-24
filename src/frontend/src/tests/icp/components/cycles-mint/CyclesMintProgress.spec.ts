import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import CyclesMintProgress from '$icp/components/cycles-mint/CyclesMintProgress.svelte';
import { ProgressStepsCyclesMint } from '$lib/enums/progress-steps';
import { CONVERT_CONTEXT_KEY, initConvertContext } from '$lib/stores/convert.store';
import { mockTcyclesToken } from '$tests/mocks/cycles-mint.mock';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('CyclesMintProgress', () => {
	it('lists sending the ICP to the CMC, then minting the TCYCLES', () => {
		const { container } = render(CyclesMintProgress, {
			props: { progressStep: ProgressStepsCyclesMint.MINT },
			context: new Map([
				[
					CONVERT_CONTEXT_KEY,
					initConvertContext({ sourceToken: ICP_TOKEN, destinationToken: mockTcyclesToken })
				]
			])
		});

		expect(container).toHaveTextContent(en.convert.text.initializing);
		expect(container).toHaveTextContent('Sending ICP to the Cycles Minting Canister...');
		expect(container).toHaveTextContent('Minting TCYCLES...');
	});
});
