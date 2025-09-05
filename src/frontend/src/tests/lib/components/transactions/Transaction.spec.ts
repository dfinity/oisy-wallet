import Transaction from '$lib/components/transactions/Transaction.svelte';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { setPrivacyMode } from '$lib/utils/privacy.utils';
import { render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/utils/format.utils', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/utils/format.utils')>();
	return {
		...actual,
		formatSecondsToDate: () => '14:23'
	};
});

let mockIsErc721 = false;
let mockIsNonFungible = false;

vi.mock('$eth/utils/erc721.utils', () => ({
	isTokenErc721: () => mockIsErc721
}));

vi.mock('$lib/utils/nft.utils', () => ({
	isTokenNonFungible: () => mockIsNonFungible
}));

vi.mock('$lib/utils/nfts.utils', () => ({
	findNft: () => ({ id: 'dummy-nft', name: 'Cool NFT' })
}));

vi.mock('$lib/validation/nft.validation', () => ({
	parseNftId: (n: number) => n
}));

vi.mock('$lib/utils/token.utils', () => ({
	getTokenDisplaySymbol: (token: any) => token?.symbol ?? 'TKN'
}));

let testContact: any | undefined = undefined;
let testAliasLabel: string | undefined = 'Work';

vi.mock('$lib/utils/contact.utils', () => ({
	getContactForAddress: ({ addressString }: { addressString: string }) => {
		return testContact?.address === addressString ? testContact : undefined;
	},
	filterAddressFromContact: () => (testAliasLabel ? { label: testAliasLabel } : undefined)
}));

const FT_TOKEN = { symbol: 'ICP', decimals: 8 };
const NFT_TOKEN = { symbol: 'COOLNFT', decimals: 0 };

describe('Transaction (single)', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		setPrivacyMode({ enabled: false });

		mockIsErc721 = false;
		mockIsNonFungible = false;
		testContact = undefined;
		testAliasLabel = 'Work';
	});

	it('renders from when we RECEIVE address', async () => {
		const fromAddress = '0xfeedface';
		testContact = undefined;

		const { container } = render(Transaction, {
			amount: 42n,
			type: 'receive',
			status: 'confirmed',
			timestamp: 1_690_000_000,
			token: FT_TOKEN as any,
			iconType: 'transaction',
			from: fromAddress
		});

		expect(await screen.findByText(/From/i)).toBeInTheDocument();
		expect(container).toHaveTextContent(shortenWithMiddleEllipsis({ text: fromAddress }));
	});

	it('when no contact is found, shows "To" and a shortened address', async () => {
		const toAddress = '0xno-contact';
		testContact = undefined;

		const { container } = render(Transaction, {
			type: 'send',
			status: 'confirmed',
			token: FT_TOKEN as any,
			iconType: 'transaction',
			to: toAddress
		});

		expect(screen.getByText(/^to$/i)).toBeInTheDocument();
		expect(container).toHaveTextContent(shortenWithMiddleEllipsis({ text: toAddress }));
	});

	it('hides amount in privacy mode (shows dots instead of amount)', async () => {
		setPrivacyMode({ enabled: true });

		const { container } = render(Transaction, {
			amount: 10n,
			type: 'send',
			status: 'pending',
			token: FT_TOKEN as any,
			iconType: 'transaction',
			to: '0xaddr'
		});

		expect(screen.queryByText(/ICP/)).toBeNull();
		expect(container).toHaveTextContent(shortenWithMiddleEllipsis({ text: '0xaddr' }));
	});

	it('does not render amount for ERC-721 tokens', async () => {
		mockIsErc721 = true;

		render(Transaction, {
			amount: 999n,
			type: 'send',
			status: 'confirmed',
			token: NFT_TOKEN as any,
			iconType: 'transaction',
			to: '0xaddr'
		});

		expect(screen.queryByText(/COOLNFT/)).toBeNull();
	});

	it('renders NFT logo in token icon mode when token is non-fungible and nft is found', async () => {
		mockIsNonFungible = true;

		const { container } = render(Transaction, {
			type: 'receive',
			status: 'unconfirmed',
			token: NFT_TOKEN as any,
			iconType: 'token',
			from: '0xaddr',
			tokenId: 1
		});

		expect(screen.getByLabelText('receive')).toBeInTheDocument();
		expect(screen.getByText(/^from$/i)).toBeInTheDocument();
		expect(container).toHaveTextContent(shortenWithMiddleEllipsis({ text: '0xaddr' }));
		expect(screen.queryByText(/COOLNFT/)).toBeNull();
	});

	it('renders token logo in token icon mode for fungible tokens (amount visible)', async () => {
		mockIsNonFungible = false;

		render(Transaction, {
			type: 'receive',
			status: 'confirmed',
			token: FT_TOKEN as any,
			iconType: 'token',
			from: '0xaddr',
			amount: 1n
		});

		expect(await screen.findByText(/ICP/)).toBeInTheDocument();
	});

	it('renders description with shortened "to" address and pending status in transaction icon mode', async () => {
		const { container } = render(Transaction, {
			type: 'send',
			status: 'pending',
			token: FT_TOKEN as any,
			iconType: 'transaction',
			to: '0xaddr'
		});

		expect(screen.getByText(/^to$/i)).toBeInTheDocument();
		expect(container).toHaveTextContent(shortenWithMiddleEllipsis({ text: '0xaddr' }));
		expect(screen.getByText(/Pending\.\.\./i)).toBeInTheDocument();
	});
});
x 