import AvatarWithBadge from '$lib/components/contact/AvatarWithBadge.svelte';
import { AVATAR_WITH_BADGE_FALLBACK_IMAGE } from '$lib/constants/test-ids.constants';
import { getMockContactsUi, mockContactIcrcAddressUi } from '$tests/mocks/contacts.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { render } from '@testing-library/svelte';

describe('AvatarWithBadge', () => {
	it('renders contact data if it is provided', () => {
		const name: string = 'Test';
		const contacts = getMockContactsUi({
			n: 1,
			name,
			addresses: [mockContactIcrcAddressUi]
		});
		const contact = contacts.at(0);
		expect(contact).toBeDefined();

		const { getByText, queryByTestId } = render(AvatarWithBadge, {
			props: {
				contact: contact!
			}
		});

		// The fallback logo should NOT be in the DOM when a contact is provided
		expect(queryByTestId(AVATAR_WITH_BADGE_FALLBACK_IMAGE)).toBeNull();

		// Should render the initial of the contact's name
		expect(getByText(name.slice(0, 1))).toBeInTheDocument();
	});

	it('renders fallback data if contact is not provided', () => {
		const { getByTestId } = render(AvatarWithBadge, {
			props: {
				address: mockSolAddress
			}
		});

		// The fallback logo should be rendered when no contact is passed
		expect(getByTestId(AVATAR_WITH_BADGE_FALLBACK_IMAGE)).toBeInTheDocument();
	});
});
