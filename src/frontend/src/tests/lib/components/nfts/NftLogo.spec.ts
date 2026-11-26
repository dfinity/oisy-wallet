import IconSend from '$lib/components/icons/IconSend.svelte';
import NftLogo from '$lib/components/nfts/NftLogo.svelte';
import { loadNftThumbnail } from '$lib/services/nft-thumbnail.services';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { getNftDisplayImageUrl, getNftDisplayName } from '$lib/utils/nft.utils';
import en from '$tests/mocks/i18n.mock';
import { mockValidErc721Nft } from '$tests/mocks/nfts.mock';
import { render } from '@testing-library/svelte';

describe('NftLogo', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render the main logo', async () => {
		const { findByTestId, findByAltText } = render(NftLogo, {
			props: {
				nft: mockValidErc721Nft,
				testId: 'nft-logo'
			}
		});

		await expect(findByTestId('nft-logo')).resolves.toBeInTheDocument();

		const expected = replacePlaceholders(en.core.alt.logo, {
			$name: getNftDisplayName(mockValidErc721Nft)
		});

		const logo = await findByAltText(expected);

		expect(logo).toBeInTheDocument();

		expect(logo).toHaveAttribute('src', getNftDisplayImageUrl(mockValidErc721Nft));
	});

	it('should render the small copy of an SVG image', async () => {
		const mockThumbnail = 'data:image/png;base64,dGh1bWJuYWls';

		vi.mocked(loadNftThumbnail).mockResolvedValueOnce(mockThumbnail);

		const { findByAltText } = render(NftLogo, {
			props: {
				nft: mockValidErc721Nft
			}
		});

		const expected = replacePlaceholders(en.core.alt.logo, {
			$name: getNftDisplayName(mockValidErc721Nft)
		});

		await expect(findByAltText(expected)).resolves.toHaveAttribute('src', mockThumbnail);
	});

	it('should use the collection fallback in the logo alt text when the NFT name is missing', async () => {
		const nft = { ...mockValidErc721Nft, name: undefined };

		const { findByAltText } = render(NftLogo, {
			props: {
				nft
			}
		});

		const expected = replacePlaceholders(en.core.alt.logo, {
			$name: getNftDisplayName(nft)
		});

		await expect(findByAltText(expected)).resolves.toBeInTheDocument();
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
