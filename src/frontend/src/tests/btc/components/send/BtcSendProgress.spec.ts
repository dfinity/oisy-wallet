import BtcSendProgress from '$btc/components/send/BtcSendProgress.svelte';
import { ProgressStepsSendBtc } from '$lib/enums/progress-steps';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('BtcSendProgress', () => {
	const props = {
		sendProgressStep: ProgressStepsSendBtc.SEND
	};

	it('renders provided snippets correctly', () => {
		const { container } = render(BtcSendProgress, {
			props
		});

		expect(container).toHaveTextContent(en.send.text.sending);
	});
});
