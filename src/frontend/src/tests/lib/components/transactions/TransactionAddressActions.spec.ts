import TransactionAddressActions from '$lib/components/transactions/TransactionAddressActions.svelte';
import { render } from '@testing-library/svelte';

describe('TransactionAddressActions', () => {
	describe('TransactionAddressActions', () => {
		it('renders nothing when no props are passed', () => {
			const { queryByTestId } = render(TransactionAddressActions, {
				props: {
					copyAddressTestId: 'copy',
					explorerUrlTestId: 'explorer'
				}
			});

			expect(queryByTestId('copy')).not.toBeInTheDocument();
			expect(queryByTestId('explorer')).not.toBeInTheDocument();
		});

		it('renders only Copy when copyAddress and copyAddressText are provided', () => {
			const { getByTestId, queryByTestId } = render(TransactionAddressActions, {
				props: {
					copyAddress: '0x123',
					copyAddressText: 'Copy this address',
					copyAddressTestId: 'copy',
					explorerUrlTestId: 'explorer'
				}
			});

			expect(getByTestId('copy')).toBeInTheDocument();
			expect(queryByTestId('explorer')).not.toBeInTheDocument();
		});

		it('renders only ExternalLink when explorerUrl and explorerUrlAriaLabel are provided', () => {
			const { getByTestId, queryByTestId } = render(TransactionAddressActions, {
				props: {
					explorerUrl: 'https://example.com',
					explorerUrlAriaLabel: 'Go to explorer',
					copyAddressTestId: 'copy',
					explorerUrlTestId: 'explorer'
				}
			});

			expect(getByTestId('explorer')).toBeInTheDocument();
			expect(queryByTestId('copy')).not.toBeInTheDocument();
		});

		it('renders both Copy and ExternalLink when all props are provided', () => {
			const { getByTestId } = render(TransactionAddressActions, {
				props: {
					copyAddress: '0x123',
					copyAddressText: 'Copy this address',
					explorerUrl: 'https://example.com',
					explorerUrlAriaLabel: 'Go to explorer',
					copyAddressTestId: 'copy',
					explorerUrlTestId: 'explorer'
				}
			});

			expect(getByTestId('copy')).toBeInTheDocument();
			expect(getByTestId('explorer')).toBeInTheDocument();
		});

		it('renders nothing if only copyAddress is provided', () => {
			const { queryByTestId } = render(TransactionAddressActions, {
				props: {
					copyAddress: '0x123',
					copyAddressTestId: 'copy',
					explorerUrlTestId: 'explorer'
				}
			});

			expect(queryByTestId('copy')).not.toBeInTheDocument();
			expect(queryByTestId('explorer')).not.toBeInTheDocument();
		});

		it('renders nothing if only copyAddressText is provided', () => {
			const { queryByTestId } = render(TransactionAddressActions, {
				props: {
					copyAddressText: 'Copy this address',
					copyAddressTestId: 'copy',
					explorerUrlTestId: 'explorer'
				}
			});

			expect(queryByTestId('copy')).not.toBeInTheDocument();
			expect(queryByTestId('explorer')).not.toBeInTheDocument();
		});

		it('renders nothing if only explorerUrl is provided', () => {
			const { queryByTestId } = render(TransactionAddressActions, {
				props: {
					explorerUrl: 'https://example.com',
					copyAddressTestId: 'copy',
					explorerUrlTestId: 'explorer'
				}
			});

			expect(queryByTestId('explorer')).not.toBeInTheDocument();
			expect(queryByTestId('copy')).not.toBeInTheDocument();
		});

		it('renders nothing if only explorerUrlAriaLabel is provided', () => {
			const { queryByTestId } = render(TransactionAddressActions, {
				props: {
					explorerUrlAriaLabel: 'Go to explorer',
					copyAddressTestId: 'copy',
					explorerUrlTestId: 'explorer'
				}
			});

			expect(queryByTestId('explorer')).not.toBeInTheDocument();
			expect(queryByTestId('copy')).not.toBeInTheDocument();
		});
	});
});
