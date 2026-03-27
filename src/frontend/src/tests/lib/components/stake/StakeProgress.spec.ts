import StakeProgress from '$lib/components/stake/StakeProgress.svelte';
import { ProgressStepsStake } from '$lib/enums/progress-steps';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('StakeProgress', () => {
	const props = {
		stakeProgressStep: ProgressStepsStake.STAKE
	};

	it('renders provided snippets correctly', () => {
		const { container } = render(StakeProgress, {
			props
		});

		expect(container).toHaveTextContent(en.send.text.sending);
	});
});
