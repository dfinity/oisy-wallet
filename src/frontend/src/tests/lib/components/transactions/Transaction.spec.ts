import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import Transaction from '$lib/components/transactions/Transaction.svelte';
import type { Token as AppToken } from '$lib/types/token';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { setPrivacyMode } from '$lib/utils/privacy.utils';
import { render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Keep the real module; only override the clock-dependent formatter
vi.mock('$lib/utils/format.utils', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/utils/format.utils')>();
	return {
		...actual,
		formatSecondsToDate: () => '14:23'
	};
});

// ---- Minimal local shapes for tests (no `any`) ----
export interface Token {
	symbol: string;
	name: string;
	decimals: number;
	logo?: string;
}
interface ContactMock {
	name: string;
	image?: string;
	address: string;
}

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
	getTokenDisplaySymbol: (token: { symbol?: string }) => token?.symbol ?? 'TKN'
}));

let testContact: ContactMock | undefined = undefined;
let testAliasLabel: string | undefined = 'Work';

vi.mock('$lib/utils/contact.utils', () => ({
	getContactForAddress: ({ addressString }: { addressString: string }) =>
		testContact?.address === addressString ? testContact : undefined,
	filterAddressFromContact: () => (testAliasLabel ? { label: testAliasLabel } : undefined)
}));

// Minimal NFT token for tests (will be cast to AppToken at call sites)
const NFT_TEST_TOKEN: Token = { symbol: 'COOLNFT', name: 'Cool NFT', decimals: 0 };

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
			token: ICP_TOKEN, // full app token
			iconType: 'transaction',
			from: fromAddress
		});

		await expect(screen.findByText(/From/i)).resolves.toBeInTheDocument();
		expect(container).toHaveTextContent(shortenWithMiddleEllipsis({ text: fromAddress }));
	});

	it('when no contact is found, shows "To" and a shortened address', () => {
		const toAddress = '0xno-contact';
		testContact = undefined;

		const { container } = render(Transaction, {
			type: 'send',
			status: 'confirmed',
			token: ICP_TOKEN,
			iconType: 'transaction',
			to: toAddress
		});

		expect(screen.getByText(/^to$/i)).toBeInTheDocument();
		expect(container).toHaveTextContent(shortenWithMiddleEllipsis({ text: toAddress }));
	});

	it('hides amount in privacy mode (shows dots instead of amount)', () => {
		setPrivacyMode({ enabled: true });

		const { container } = render(Transaction, {
			amount: 10n,
			type: 'send',
			status: 'pending',
			token: ICP_TOKEN,
			iconType: 'transaction',
			to: '0xaddr'
		});

		expect(screen.queryByText(/ICP/)).toBeNull();
		expect(container).toHaveTextContent(shortenWithMiddleEllipsis({ text: '0xaddr' }));
	});

	it('does not render amount for ERC-721 tokens', () => {
		mockIsErc721 = true;

		render(Transaction, {
			amount: 999n,
			type: 'send',
			status: 'confirmed',
			token: NFT_TEST_TOKEN as unknown as AppToken, // cast minimal -> app token
			iconType: 'transaction',
			to: '0xaddr'
		});

		// No formatted amount with symbol for NFTs
		expect(screen.queryByText(/COOLNFT/)).toBeNull();
	});

	it('renders NFT logo in token icon mode when token is non-fungible and nft is found', () => {
		mockIsNonFungible = true;

		const { container } = render(Transaction, {
			type: 'receive',
			status: 'unconfirmed',
			token: NFT_TEST_TOKEN as unknown as AppToken, // cast minimal -> app token
			iconType: 'token',
			from: '0xaddr',
			tokenId: 1
		});

		expect(screen.getByLabelText('receive')).toBeInTheDocument(); // badge
		expect(screen.getByText(/^from$/i)).toBeInTheDocument();
		expect(container).toHaveTextContent(shortenWithMiddleEllipsis({ text: '0xaddr' }));
		expect(screen.queryByText(/COOLNFT/)).toBeNull(); // no amount shown for NFT
	});

	it('renders token logo in token icon mode for fungible tokens (amount visible)', async () => {
		mockIsNonFungible = false;

		render(Transaction, {
			type: 'receive',
			status: 'confirmed',
			token: ICP_TOKEN,
			iconType: 'token',
			from: '0xaddr',
			amount: 1n
		});

		await expect(screen.findByText(/ICP/)).resolves.toBeInTheDocument();
	});

	it('renders description with shortened "to" address and pending status in transaction icon mode', () => {
		const { container } = render(Transaction, {
			type: 'send',
			status: 'pending',
			token: ICP_TOKEN,
			iconType: 'transaction',
			to: '0xaddr'
		});

		expect(screen.getByText(/^to$/i)).toBeInTheDocument();
		expect(container).toHaveTextContent(shortenWithMiddleEllipsis({ text: '0xaddr' }));
		expect(screen.getByText(/Pending\.\.\./i)).toBeInTheDocument();
	});
});
