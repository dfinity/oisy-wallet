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

	// Nothing resolves a name on this branch — no contacts, and the wizard step renders this
	// without `knownDestinations` — so prompting for one walks the user into an invalid-address
	// error. The shared `enter_recipient_address` is correct again once either source is wired.
	it('asks for an address only, not a name or alias', () => {
		const { container } = render(XrpSendDestination, {
			props: { destination: '', invalidDestination: false }
		});

		expect(input(container).placeholder).toBe(en.send.placeholder.enter_xrp_address);
		expect(input(container).placeholder).not.toBe(en.send.placeholder.enter_recipient_address);
	});
});
