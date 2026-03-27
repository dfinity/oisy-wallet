import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import IcSendProgress from '$icp/components/send/IcSendProgress.svelte';
import { ProgressStepsSendIc } from '$lib/enums/progress-steps';
import { initSendContext, SEND_CONTEXT_KEY } from '$lib/stores/send.store';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('IcSendProgress', () => {
	const mockContext = new Map([]);
	mockContext.set(
		SEND_CONTEXT_KEY,
		initSendContext({
			token: ICP_TOKEN
		})
	);

	const props = {
		sendProgressStep: ProgressStepsSendIc.SEND
	};

	it('renders provided snippets correctly', () => {
		const { container } = render(IcSendProgress, {
			props,
			context: mockContext
		});

		expect(container).toHaveTextContent(en.send.text.sending);
	});
});
