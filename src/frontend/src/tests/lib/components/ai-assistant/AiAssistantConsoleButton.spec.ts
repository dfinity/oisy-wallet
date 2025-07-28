import * as aiAssistantEnv from '$env/ai-assistant.env';
import AiAssistantConsoleButton from '$lib/components/ai-assistant/AiAssistantConsoleButton.svelte';
import { AI_ASSISTANT_CONSOLE_BUTTON } from '$lib/constants/test-ids.constants';
import { mockAuthSignedIn } from '$tests/mocks/auth.mock';
import { render } from '@testing-library/svelte';

describe('AiAssistantConsoleButton', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('render the button if all conditions are met', () => {
		mockAuthSignedIn(true);
		vi.spyOn(aiAssistantEnv, 'AI_ASSISTANT_CONSOLE_ENABLED', 'get').mockImplementation(() => true);

		const { getByTestId } = render(AiAssistantConsoleButton);

		expect(getByTestId(AI_ASSISTANT_CONSOLE_BUTTON)).toBeInTheDocument();
	});

	it('does not render the button if feature flag is not on', () => {
		mockAuthSignedIn(true);

		const { getByTestId } = render(AiAssistantConsoleButton);

		expect(() => getByTestId(AI_ASSISTANT_CONSOLE_BUTTON)).toThrow();
	});

	it('does not render the button if user is not signed in', () => {
		vi.spyOn(aiAssistantEnv, 'AI_ASSISTANT_CONSOLE_ENABLED', 'get').mockImplementation(() => true);

		const { getByTestId } = render(AiAssistantConsoleButton);

		expect(() => getByTestId(AI_ASSISTANT_CONSOLE_BUTTON)).toThrow();
	});
});
