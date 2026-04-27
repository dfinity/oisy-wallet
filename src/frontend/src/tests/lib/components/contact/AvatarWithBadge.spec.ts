import AvatarWithBadge from '$lib/components/contact/AvatarWithBadge.svelte';
import { AVATAR_WITH_BADGE_FALLBACK_IMAGE } from '$lib/constants/test-ids.constants';
import type { ContactUi } from '$lib/types/contact';
import { getMockContactsUi, mockContactIcrcAddressUi } from '$tests/mocks/contacts.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { render } from '@testing-library/svelte';

describe('AvatarWithBadge', () => {
	it('renders contact data if it is provided', () => {
		const name = 'Test';
		const { getByText, getByTestId } = render(AvatarWithBadge, {
			props: {
				contact: getMockContactsUi({
					n: 1,
					name,
					addresses: [mockContactIcrcAddressUi]
				})[0] as unknown as ContactUi
			}
		});

		expect(() => getByTestId(AVATAR_WITH_BADGE_FALLBACK_IMAGE)).toThrow();
		expect(getByText(`${name[0]}`)).toBeInTheDocument();
	});

	it('renders fallback data if contact is not provided', () => {
		const { getByTestId } = render(AvatarWithBadge, {
			props: {
				address: mockSolAddress
			}
		});

		expect(getByTestId(AVATAR_WITH_BADGE_FALLBACK_IMAGE)).toBeInTheDocument();
	});
});
