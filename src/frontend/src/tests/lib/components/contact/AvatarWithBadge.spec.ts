import AvatarWithBadge from '$lib/components/contact/AvatarWithBadge.svelte';
import { AVATAR_WITH_BADGE_FALLBACK_IMAGE } from '$lib/constants/test-ids.constants';
import type { ContactUi } from '$lib/types/contact';
import { getMockContactsUi, mockContactIcrcAddressUi } from '$tests/mocks/contacts.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { render } from '@testing-library/svelte';

describe('AvatarWithBadge', () => {
  it('renders contact data if it is provided', () => {
    const name = 'Test';
    const { getByText, queryByTestId } = render(AvatarWithBadge, {
      props: {
        contact: getMockContactsUi({
          n: 1,
          name,
          addresses: [mockContactIcrcAddressUi]
        }).at(0)!
      }
    });

    // The fallback logo should NOT be in the DOM when a contact is provided
    expect(queryByTestId(AVATAR_WITH_BADGE_FALLBACK_IMAGE)).toBeNull();

    // Should render the initial of the contact's name
    expect(getByText(name[0] as string)).toBeInTheDocument();
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
