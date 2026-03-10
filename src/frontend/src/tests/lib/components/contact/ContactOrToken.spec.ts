import ContactOrToken from '$lib/components/contact/ContactOrToken.svelte';
import * as allTokensDerived from '$lib/derived/all-tokens.derived';
import * as contactsDerived from '$lib/derived/contacts.derived';
import type { ContactUi } from '$lib/types/contact';
import type { Token } from '$lib/types/token';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { getMockContactsUi, mockContactEthAddressUi } from '$tests/mocks/contacts.mock';
import { mockLedgerCanisterId, mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { render } from '@testing-library/svelte';

const mockAllTokens = (tokens: Token[]) => {
	vi.spyOn(allTokensDerived.allTokens, 'subscribe').mockImplementation((fn) => {
		fn(tokens.map((t) => ({ ...t, enabled: true })));
		return () => {};
	});
};

const mockAllContacts = (contacts: ContactUi[]) => {
	vi.spyOn(contactsDerived.allContacts, 'subscribe').mockImplementation((fn) => {
		fn(contacts);
		return () => {};
	});
};

describe('ContactOrToken', () => {
	const ethAddress = mockContactEthAddressUi.address;

	const [mockContact] = getMockContactsUi({
		n: 1,
		name: 'Alice',
		addresses: [{ address: ethAddress, addressType: 'Eth', label: 'Main wallet' }]
	});

	beforeEach(() => {
		vi.restoreAllMocks();

		mockAllTokens([]);

		mockAllContacts([]);
	});

	it('should render nothing when identifier is undefined', () => {
		const { container } = render(ContactOrToken, {
			props: { identifier: undefined }
		});

		expect(container.textContent?.trim()).toBe('');
	});

	it('should render nothing when identifier does not match any token or contact and showFallback is false', () => {
		const { container } = render(ContactOrToken, {
			props: { identifier: ethAddress }
		});

		expect(container.textContent?.trim()).toBe('');
	});

	it('should render TokenAsContact when identifier matches a token', () => {
		mockAllTokens([mockValidIcToken]);

		const { getByText } = render(ContactOrToken, {
			props: { identifier: mockLedgerCanisterId }
		});

		expect(getByText(mockValidIcToken.name)).toBeInTheDocument();
		expect(getByText(mockValidIcToken.symbol)).toBeInTheDocument();
	});

	it('should render ContactWithAvatar when identifier matches a contact', () => {
		mockAllContacts([mockContact]);

		const { getByText } = render(ContactOrToken, {
			props: { identifier: ethAddress }
		});

		expect(getByText('Alice')).toBeInTheDocument();
	});

	it('should render contact address label when present', () => {
		mockAllContacts([mockContact]);

		const { getByText } = render(ContactOrToken, {
			props: { identifier: ethAddress }
		});

		expect(getByText('Main wallet')).toBeInTheDocument();
	});

	it('should render shortened identifier as fallback when showFallback is true', () => {
		const longIdentifier = '0x1234567890abcdef1234567890abcdef12345678';

		const { getByText } = render(ContactOrToken, {
			props: { identifier: longIdentifier, showFallback: true }
		});

		expect(getByText(shortenWithMiddleEllipsis({ text: longIdentifier }))).toBeInTheDocument();
	});

	it('should not render fallback when showFallback is false', () => {
		const longIdentifier = '0x1234567890abcdef1234567890abcdef12345678';

		const { container } = render(ContactOrToken, {
			props: { identifier: longIdentifier, showFallback: false }
		});

		expect(container.textContent?.trim()).toBe('');
	});

	it('should prioritise token over contact when both match', () => {
		mockAllTokens([mockValidIcToken]);
		mockAllContacts([
			getMockContactsUi({
				n: 1,
				name: 'Token Contact',
				addresses: [{ address: mockLedgerCanisterId, addressType: 'Icrcv2' }]
			})[0]
		]);

		const { getByText, queryByText } = render(ContactOrToken, {
			props: { identifier: mockLedgerCanisterId }
		});

		expect(getByText(mockValidIcToken.name)).toBeInTheDocument();
		expect(queryByText('Token Contact')).not.toBeInTheDocument();
	});

	it('should not render fallback when identifier is undefined even with showFallback true', () => {
		const { container } = render(ContactOrToken, {
			props: { identifier: undefined, showFallback: true }
		});

		expect(container.textContent?.trim()).toBe('');
	});
});
