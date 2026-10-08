import IconSend from '$lib/components/icons/IconSend.svelte';
import NftLogo from '$lib/components/nfts/NftLogo.svelte';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { getNftDisplayName } from '$lib/utils/nft.utils';
import en from '$tests/mocks/i18n.mock';
import { mockValidErc721Nft } from '$tests/mocks/nfts.mock';
import { render } from '@testing-library/svelte';

describe('NftLogo', () => {
	it('should render the main logo', () => {
		const { getByTestId, getByAltText } = render(NftLogo, {
			props: {
				nft: mockValidErc721Nft,
				testId: 'nft-logo'
			}
		});

		expect(getByTestId('nft-logo')).toBeInTheDocument();

		const expected = replacePlaceholders(en.core.alt.logo, {
			$name: getNftDisplayName(mockValidErc721Nft)
		});

		expect(getByAltText(expected)).toBeInTheDocument();
	});

	it('should use the collection fallback in the logo alt text when the NFT name is missing', () => {
		const nft = { ...mockValidErc721Nft, name: undefined };

		const { getByAltText } = render(NftLogo, {
			props: {
				nft
			}
		});

		const expected = replacePlaceholders(en.core.alt.logo, {
			$name: getNftDisplayName(nft)
		});

		expect(getByAltText(expected)).toBeInTheDocument();
	});

	it('should not render the badge when it is not provided', () => {
		const { queryByTestId } = render(NftLogo, {
			props: {
				nft: mockValidErc721Nft,
				badgeTestId: 'badge'
			}
		});

		expect(queryByTestId('network-badge')).toBeNull();
		expect(queryByTestId('icon-badge')).toBeNull();
	});

	describe('when badge type is "network"', () => {
		it('should display network icon badge', () => {
			const { getByTestId } = render(NftLogo, {
				props: {
					nft: mockValidErc721Nft,
					badge: { type: 'network' },
					badgeTestId: 'badge'
				}
			});

			expect(getByTestId('network-badge-default')).toBeInTheDocument();
		});
	});

	describe('when badge type is "icon"', () => {
		it('should display icon badge', () => {
			const { getByTestId } = render(NftLogo, {
				props: {
					nft: mockValidErc721Nft,
					badge: {
						type: 'icon',
						icon: IconSend,
						ariaLabel: 'send'
					},
					badgeTestId: 'badge'
				}
			});

			expect(getByTestId('icon-badge')).toBeInTheDocument();
		});
	});
});
