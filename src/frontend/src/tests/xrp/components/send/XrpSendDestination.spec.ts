import { DESTINATION_INPUT } from '$lib/constants/test-ids.constants';
import en from '$tests/mocks/i18n.mock';
import XrpSendDestination from '$xrp/components/send/XrpSendDestination.svelte';
import { render } from '@testing-library/svelte';

describe('XrpSendDestination', () => {
	const input = (container: HTMLElement): HTMLInputElement => {
		const found = container.querySelector<HTMLInputElement>(
			`input[data-tid="${DESTINATION_INPUT}"]`
		);

		expect(found).not.toBeNull();

		return found as HTMLInputElement;
	};

	// Contacts resolve names and aliases here, so the shared prompt applies to XRP too.
	it('asks for an address, name or alias', () => {
		const { container } = render(XrpSendDestination, {
			props: { destination: '', invalidDestination: false }
		});

		expect(input(container).placeholder).toBe(en.send.placeholder.enter_recipient_address);
	});
});
