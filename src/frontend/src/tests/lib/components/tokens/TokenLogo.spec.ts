import IconSend from '$lib/components/icons/IconSend.svelte';
import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { render } from '@testing-library/svelte';

describe('TokenLogo', () => {
	const mockToken = {
		...mockValidIcToken,
		icon: 'token-icon-url',
		network: {
			...mockValidIcToken.network,
			icon: 'network-icon-url',
			iconBW: 'network-icon-bw-url'
		}
	};

	it('should render the main logo', () => {
		const { getByTestId, getByAltText } = render(TokenLogo, {
			props: { data: mockToken, testId: 'token-logo' }
		});

		expect(getByTestId('token-logo')).toBeInTheDocument();

		const expected = replacePlaceholders(en.core.alt.logo, { $name: mockToken.name });

		expect(getByAltText(expected)).toBeInTheDocument();
	});

	it('should not render the badge when it is not provided', () => {
		const { queryByTestId } = render(TokenLogo, {
			props: { data: { ...mockToken, icon: undefined }, badgeTestId: 'badge' }
		});

		expect(queryByTestId('token-logo-badge')).toBeNull();
	});

	describe('when badge type is "tokenCount"', () => {
		it('should display token count badge when count > 0', () => {
			const { getByTestId, getByText } = render(TokenLogo, {
				props: {
					data: mockToken,
					badge: { type: 'tokenCount', count: 123 },
					badgeTestId: 'badge'
				}
			});

			expect(getByTestId('token-count-badge')).toBeInTheDocument();
			expect(getByText('123')).toBeInTheDocument();
		});

		it('should not display token count badge when count is 0', () => {
			const { queryByTestId } = render(TokenLogo, {
				props: {
					data: mockToken,
					badge: { type: 'tokenCount', count: 0 },
					badgeTestId: 'badge'
				}
			});

			expect(queryByTestId('token-count-badge')).toBeNull();
		});
	});

	describe('when badge type is "network"', () => {
		it('should display network icon badge', () => {
			const { getByTestId } = render(TokenLogo, {
				props: { data: mockToken, badge: { type: 'network' }, badgeTestId: 'badge' }
			});

			expect(getByTestId('network-badge-light')).toBeInTheDocument();
			expect(getByTestId('network-badge-dark')).toBeInTheDocument();
		});
	});

	describe('when badge type is "icon"', () => {
		it('should display icon badge', () => {
			const { getByTestId } = render(TokenLogo, {
				props: {
					data: mockToken,
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
