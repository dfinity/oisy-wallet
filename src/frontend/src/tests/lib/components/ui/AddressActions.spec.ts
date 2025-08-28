import AddressActions from '$lib/components/ui/AddressActions.svelte';
import { render } from '@testing-library/svelte';

describe('AddressActions', () => {
	describe('AddressActions', () => {
		it('renders nothing when no props are passed', () => {
			const { queryByTestId } = render(AddressActions, {
				props: {
					copyAddressTestId: 'copy',
					externalLinkTestId: 'explorer'
				}
			});

			expect(queryByTestId('copy')).not.toBeInTheDocument();
			expect(queryByTestId('explorer')).not.toBeInTheDocument();
		});

		it('renders only Copy when copyAddress and copyAddressText are provided', () => {
			const { getByTestId, queryByTestId } = render(AddressActions, {
				props: {
					copyAddress: '0x123',
					copyAddressText: 'Copy this address',
					copyAddressTestId: 'copy',
					externalLinkTestId: 'explorer'
				}
			});

			expect(getByTestId('copy')).toBeInTheDocument();
			expect(queryByTestId('explorer')).not.toBeInTheDocument();
		});

		it('renders only ExternalLink when externalLink and externalLinkAriaLabel are provided', () => {
			const { getByTestId, queryByTestId } = render(AddressActions, {
				props: {
					externalLink: 'https://example.com',
					externalLinkAriaLabel: 'Go to explorer',
					copyAddressTestId: 'copy',
					externalLinkTestId: 'explorer'
				}
			});

			expect(getByTestId('explorer')).toBeInTheDocument();
			expect(queryByTestId('copy')).not.toBeInTheDocument();
		});

		it('renders both Copy and ExternalLink when all props are provided', () => {
			const { getByTestId } = render(AddressActions, {
				props: {
					copyAddress: '0x123',
					copyAddressText: 'Copy this address',
					externalLink: 'https://example.com',
					externalLinkAriaLabel: 'Go to explorer',
					copyAddressTestId: 'copy',
					externalLinkTestId: 'explorer'
				}
			});

			expect(getByTestId('copy')).toBeInTheDocument();
			expect(getByTestId('explorer')).toBeInTheDocument();
		});

		it('renders nothing if only copyAddress is provided', () => {
			const { queryByTestId } = render(AddressActions, {
				props: {
					copyAddress: '0x123',
					copyAddressTestId: 'copy',
					externalLinkTestId: 'explorer'
				}
			});

			expect(queryByTestId('copy')).not.toBeInTheDocument();
			expect(queryByTestId('explorer')).not.toBeInTheDocument();
		});

		it('renders nothing if only copyAddressText is provided', () => {
			const { queryByTestId } = render(AddressActions, {
				props: {
					copyAddressText: 'Copy this address',
					copyAddressTestId: 'copy',
					externalLinkTestId: 'explorer'
				}
			});

			expect(queryByTestId('copy')).not.toBeInTheDocument();
			expect(queryByTestId('explorer')).not.toBeInTheDocument();
		});

		it('renders nothing if only externalLink is provided', () => {
			const { queryByTestId } = render(AddressActions, {
				props: {
					externalLink: 'https://example.com',
					copyAddressTestId: 'copy',
					externalLinkTestId: 'explorer'
				}
			});

			expect(queryByTestId('explorer')).not.toBeInTheDocument();
			expect(queryByTestId('copy')).not.toBeInTheDocument();
		});

		it('renders nothing if only externalLinkAriaLabel is provided', () => {
			const { queryByTestId } = render(AddressActions, {
				props: {
					externalLinkAriaLabel: 'Go to explorer',
					copyAddressTestId: 'copy',
					externalLinkTestId: 'explorer'
				}
			});

			expect(queryByTestId('explorer')).not.toBeInTheDocument();
			expect(queryByTestId('copy')).not.toBeInTheDocument();
		});
	});
});
