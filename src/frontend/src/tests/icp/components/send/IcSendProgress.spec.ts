import IcSendProgress from '$icp/components/send/IcSendProgress.svelte';
import { ProgressStepsSendIc } from '$lib/enums/progress-steps';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('IcSendProgress', () => {
	const props = {
		sendProgressStep: ProgressStepsSendIc.SEND
	};

	it('renders provided snippets correctly', () => {
		const { container } = render(IcSendProgress, {
			props
		});

		expect(container).toHaveTextContent(en.send.text.sending);
	});
});
