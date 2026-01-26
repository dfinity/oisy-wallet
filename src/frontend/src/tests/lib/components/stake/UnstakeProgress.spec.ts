import UnstakeProgress from '$lib/components/stake/UnstakeProgress.svelte';
import { ProgressStepsUnstake } from '$lib/enums/progress-steps';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('UnstakeProgress', () => {
	const props = {
		unstakeProgressStep: ProgressStepsUnstake.UNSTAKE
	};

	it('renders data correctly', () => {
		const { container } = render(UnstakeProgress, {
			props
		});

		expect(container).toHaveTextContent(en.stake.text.unstaking);
	});
});
