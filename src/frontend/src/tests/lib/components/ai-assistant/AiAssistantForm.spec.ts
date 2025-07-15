import AiAssistantForm from '$lib/components/ai-assistant/AiAssistantForm.svelte';
import { AI_ASSISTANT_SEND_MESSAGE_BUTTON } from '$lib/constants/test-ids.constants';
import { fireEvent, render } from '@testing-library/svelte';

describe('AiAssistantForm', () => {
	it('submits the form if button is not disabled', async () => {
		const onMessageSubmit = vi.fn();
		const { getByTestId } = render(AiAssistantForm, {
			props: {
				value: 'test',
				disabled: false,
				onMessageSubmit
			}
		});

		const button = getByTestId(AI_ASSISTANT_SEND_MESSAGE_BUTTON);

		await fireEvent.click(button);

		expect(onMessageSubmit).toHaveBeenCalledOnce();
	});

	it('does not submit the form if button is disabled', async () => {
		const onMessageSubmit = vi.fn();
		const { getByTestId } = render(AiAssistantForm, {
			props: {
				value: 'test',
				disabled: true,
				onMessageSubmit
			}
		});

		const button = getByTestId(AI_ASSISTANT_SEND_MESSAGE_BUTTON);

		await fireEvent.click(button);

		expect(onMessageSubmit).not.toHaveBeenCalledOnce();
	});
});
