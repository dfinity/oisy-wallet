import * as aiAssistantEnv from '$env/ai-assistant.env';
import AiAssistantConsoleButton from '$lib/components/ai-assistant/AiAssistantConsoleButton.svelte';
import { AI_ASSISTANT_CONSOLE_BUTTON } from '$lib/constants/test-ids.constants';
import { userProfileStore } from '$lib/stores/user-profile.store';
import { mockAuthSignedIn } from '$tests/mocks/auth.mock';
import { mockUserProfile } from '$tests/mocks/user-profile.mock';
import { render } from '@testing-library/svelte';

describe('AiAssistantConsoleButton', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		userProfileStore.reset();
	});

	it('render the button if all conditions are met', () => {
		mockAuthSignedIn(true);
		userProfileStore.set({ certified: true, profile: mockUserProfile });
		vi.spyOn(aiAssistantEnv, 'AI_ASSISTANT_CONSOLE_ENABLED', 'get').mockImplementation(() => true);

		const { getByTestId } = render(AiAssistantConsoleButton);

		expect(getByTestId(AI_ASSISTANT_CONSOLE_BUTTON)).toBeInTheDocument();
	});

	it('does not render the button if feature flag is not on', () => {
		mockAuthSignedIn(true);
		userProfileStore.set({ certified: true, profile: mockUserProfile });

		const { getByTestId } = render(AiAssistantConsoleButton);

		expect(() => getByTestId(AI_ASSISTANT_CONSOLE_BUTTON)).toThrow();
	});

	it('does not render the button if user is not signed in', () => {
		userProfileStore.set({ certified: true, profile: mockUserProfile });
		vi.spyOn(aiAssistantEnv, 'AI_ASSISTANT_CONSOLE_ENABLED', 'get').mockImplementation(() => true);

		const { getByTestId } = render(AiAssistantConsoleButton);

		expect(() => getByTestId(AI_ASSISTANT_CONSOLE_BUTTON)).toThrow();
	});

	it('does not render the button if experimental feature setting is disabled', () => {
		mockAuthSignedIn(true);
		vi.spyOn(aiAssistantEnv, 'AI_ASSISTANT_CONSOLE_ENABLED', 'get').mockImplementation(() => true);

		const { getByTestId } = render(AiAssistantConsoleButton);

		expect(() => getByTestId(AI_ASSISTANT_CONSOLE_BUTTON)).toThrow();
	});
});
