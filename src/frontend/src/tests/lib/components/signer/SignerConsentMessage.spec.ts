import SignerConsentMessage from '$lib/components/signer/SignerConsentMessage.svelte';
import { SIGNER_CONTEXT_KEY } from '$lib/stores/signer.store';
import en from '$tests/mocks/i18n.mock';
import type { ConsentMessagePromptPayload } from '@dfinity/oisy-wallet-signer';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { writable } from 'svelte/store';

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

describe('SignerConsentMessage', () => {
	const approve = vi.fn();
	const reject = vi.fn();
	const resetConsentMessagePrompt = vi.fn();
	const resetCallCanisterPrompt = vi.fn();

	const renderComponent = (message: string) => {
		const payload: ConsentMessagePromptPayload = {
			origin: 'https://relying.party',
			status: 'result',
			consentInfo: {
				Ok: {
					metadata: { language: 'en', utc_offset_minutes: [] },
					consent_message: { GenericDisplayMessage: message }
				}
			},
			approve,
			reject
		};

		return render(SignerConsentMessage, {
			context: new Map([
				[
					SIGNER_CONTEXT_KEY,
					{
						consentMessagePrompt: {
							payload: writable<ConsentMessagePromptPayload>(payload),
							reset: resetConsentMessagePrompt
						},
						callCanisterPrompt: {
							payload: writable(undefined),
							reset: resetCallCanisterPrompt
						}
					}
				]
			])
		});
	};

	// The memo of an ICRC-1 transfer is decoded verbatim into the consent message when the target
	// ledger does not implement ICRC-21, so its content is authored by the relying party.
	const buildMessageWithMemo = (memo: string): string =>
		`# Approve the transfer of funds\n\n**Amount:**\n1 ICP\n\n**Memo:**\n${memo}`;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should approve when our own approve button is activated', async () => {
		const { getByText } = renderComponent(buildMessageWithMemo('Invoice 42'));

		await fireEvent.click(getByText(en.core.text.approve));

		expect(approve).toHaveBeenCalledOnce();
	});

	it('should not render the dialog within a form', async () => {
		const { container } = renderComponent(buildMessageWithMemo('Invoice 42'));

		await waitFor(() => expect(container.querySelector('.msg p')).not.toBeNull());

		expect(container.querySelector('form')).toBeNull();
	});

	it('should not render an interactive control originating from the consent message', async () => {
		const { container } = renderComponent(
			buildMessageWithMemo('<button style=zoom:99>Approve</button>')
		);

		await waitFor(() => expect(container.querySelector('.msg p')).not.toBeNull());

		expect(container.querySelector('.msg button')).toBeNull();
		// The label of the injected control remains, as inert text.
		expect(container.querySelector('.msg')?.textContent).toContain(en.core.text.approve);

		const buttons = container.querySelectorAll('button');

		expect(buttons).toHaveLength(2);
		expect(buttons[0].textContent?.trim()).toBe(en.core.text.reject);
		expect(buttons[1].textContent?.trim()).toBe(en.core.text.approve);
	});

	it('should not approve when any element originating from the consent message is activated', async () => {
		const { container } = renderComponent(
			buildMessageWithMemo('<button style=zoom:99>Approve</button>')
		);

		await waitFor(() => expect(container.querySelector('.msg p')).not.toBeNull());

		const consentMessage = container.querySelector('.msg');

		for (const element of consentMessage?.querySelectorAll('*') ?? []) {
			await fireEvent.click(element);
		}

		expect(approve).not.toHaveBeenCalled();
	});

	it('should not let the consent message style the dialog', async () => {
		const { container } = renderComponent(
			buildMessageWithMemo('<style>p{display:none}</style>Invoice 42')
		);

		await waitFor(() => expect(container.querySelector('.msg p')).not.toBeNull());

		expect(container.querySelector('style')).toBeNull();
		expect(container.innerHTML).not.toContain('display:none');
	});
});
