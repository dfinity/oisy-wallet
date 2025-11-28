import { BONK_TOKEN } from '$env/tokens/tokens-spl/tokens.bonk.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import Transaction from '$lib/components/transactions/Transaction.svelte';
import { currentLanguage } from '$lib/derived/i18n.derived';
import { contactsStore } from '$lib/stores/contacts.store';
import { nftStore } from '$lib/stores/nft.store';
import { formatSecondsToDate, shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { setPrivacyMode } from '$lib/utils/privacy.utils';
import { getMockContactsUi } from '$tests/mocks/contacts.mock';
import { AZUKI_ELEMENTAL_BEANS_TOKEN } from '$tests/mocks/erc721-tokens.mock';
import en from '$tests/mocks/i18n.mock';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('Transaction', () => {
	const NFT_TEST_TOKEN = AZUKI_ELEMENTAL_BEANS_TOKEN;

	beforeEach(() => {
		vi.clearAllMocks();

		setPrivacyMode({ enabled: false });

		contactsStore.reset();
	});

	it('should render `from` when we RECEIVE address', () => {
		const fromAddress = '0xfeedface';

		const { container, getByText } = render(Transaction, {
			displayAmount: 42n,
			type: 'receive',
			status: 'confirmed',
			timestamp: 1_690_000_000,
			token: ICP_TOKEN,
			iconType: 'transaction',
			from: fromAddress,
			children: mockSnippet
		});

		expect(getByText(/From/i)).toBeInTheDocument();
		expect(container).toHaveTextContent(shortenWithMiddleEllipsis({ text: fromAddress }));
	});

	it('should show "To" and a shortened address when no contact is found', () => {
		const toAddress = '0xno-contact';

		const { container, getByText } = render(Transaction, {
			type: 'send',
			status: 'confirmed',
			token: ICP_TOKEN,
			iconType: 'transaction',
			to: toAddress,
			children: mockSnippet
		});

		expect(getByText(/^to$/i)).toBeInTheDocument();
		expect(container).toHaveTextContent(shortenWithMiddleEllipsis({ text: toAddress }));
	});

	it('should show "To" and the contacts name when a contact is found', () => {
		const toAddress = '0xJOHNNY';

		const contact = getMockContactsUi({
			n: 1,
			name: 'Johnny',
			addresses: [
				{
					addressType: 'Btc',
					address: toAddress,
					label: 'My Bitcoin Address'
				}
			]
		});

		contactsStore.set([...contact]);

		const { getByText } = render(Transaction, {
			type: 'send',
			status: 'confirmed',
			token: ICP_TOKEN,
			iconType: 'transaction',
			to: toAddress,
			children: mockSnippet
		});

		expect(getByText(/^to$/i)).toBeInTheDocument();
		expect(getByText(/^Johnny$/i)).toBeInTheDocument();
	});

	it('should show "For" and the spender accounts contact name for approve transactions when a contact is found', () => {
		const forAddress = '0xJOHNNY';

		const contact = getMockContactsUi({
			n: 1,
			name: 'Johnny',
			addresses: [
				{
					addressType: 'Btc',
					address: forAddress,
					label: 'My Bitcoin Address'
				}
			]
		});

		contactsStore.set([...contact]);

		const { getByText } = render(Transaction, {
			type: 'approve',
			status: 'confirmed',
			token: ICP_TOKEN,
			iconType: 'transaction',
			to: '0xSOMEADDRESS',
			approveSpender: forAddress,
			children: mockSnippet
		});

		expect(getByText(/^for$/i)).toBeInTheDocument();
		expect(getByText(/^Johnny$/i)).toBeInTheDocument();
	});

	it('should hide amount in privacy mode (shows dots instead of amount)', () => {
		setPrivacyMode({ enabled: true });

		const { container, queryByText } = render(Transaction, {
			displayAmount: 10n,
			type: 'send',
			status: 'pending',
			token: ICP_TOKEN,
			iconType: 'transaction',
			to: '0xaddr',
			children: mockSnippet
		});

		expect(queryByText(/ICP/)).toBeNull();
		expect(container).toHaveTextContent(shortenWithMiddleEllipsis({ text: '0xaddr' }));
	});

	it('should render NFT logo in token icon mode when token is non-fungible and nft is found', () => {
		const { container, getByLabelText, getByText, queryByText, getByAltText } = render(
			Transaction,
			{
				type: 'receive',
				status: 'unconfirmed',
				token: NFT_TEST_TOKEN,
				iconType: 'token',
				from: '0xaddr',
				tokenId: 1,
				children: mockSnippet
			}
		);

		expect(getByLabelText('receive')).toBeInTheDocument(); // badge
		expect(getByText(/^from$/i)).toBeInTheDocument();
		expect(container).toHaveTextContent(shortenWithMiddleEllipsis({ text: '0xaddr' }));
		expect(queryByText(/MBeans/)).toBeNull(); // no amount shown for NFT
		expect(
			getByAltText(replacePlaceholders(en.core.alt.logo, { $name: NFT_TEST_TOKEN.name }))
		).toBeInTheDocument();
	});

	it('should render NFT logo in token icon mode when token is non-fungible and nft is not found but has metadata', () => {
		nftStore.resetAll();

		const { container, getByLabelText, getByText, queryByText, getByAltText } = render(
			Transaction,
			{
				type: 'receive',
				status: 'unconfirmed',
				token: NFT_TEST_TOKEN,
				iconType: 'token',
				from: '0xaddr',
				tokenId: 1,
				children: mockSnippet
			}
		);

		expect(getByLabelText('receive')).toBeInTheDocument(); // badge
		expect(getByText(/^from$/i)).toBeInTheDocument();
		expect(container).toHaveTextContent(shortenWithMiddleEllipsis({ text: '0xaddr' }));
		expect(queryByText(/MBeans/)).toBeNull(); // no amount shown for NFT
		expect(
			getByAltText(replacePlaceholders(en.core.alt.logo, { $name: NFT_TEST_TOKEN.name }))
		).toBeInTheDocument();
	});

	it('should render token logo in token icon mode for fungible tokens (amount visible)', () => {
		const { getByText, getByAltText } = render(Transaction, {
			type: 'receive',
			status: 'confirmed',
			token: BONK_TOKEN,
			iconType: 'token',
			from: '0xaddr',
			displayAmount: 1n,
			children: mockSnippet
		});

		expect(getByText(/BONK/)).toBeInTheDocument();
		expect(
			getByAltText(replacePlaceholders(en.core.alt.logo, { $name: BONK_TOKEN.name }))
		).toBeInTheDocument();
	});

	it('should render description with shortened "to" address and pending status in transaction icon mode', () => {
		const { container, getByText } = render(Transaction, {
			type: 'send',
			status: 'pending',
			token: ICP_TOKEN,
			iconType: 'transaction',
			to: '0xaddr',
			children: mockSnippet
		});

		expect(getByText(/^to$/i)).toBeInTheDocument();
		expect(container).toHaveTextContent(shortenWithMiddleEllipsis({ text: '0xaddr' }));
		expect(getByText(/Pending\.\.\./i)).toBeInTheDocument();
	});

	it('should render full date when timeOnly is false', () => {
		const { container, getByText } = render(Transaction, {
			displayAmount: 42n,
			type: 'receive',
			status: 'confirmed',
			timestamp: 1_690_000_000,
			token: ICP_TOKEN,
			iconType: 'transaction',
			children: mockSnippet,
			timeOnly: false
		});

		expect(getByText(/From/i)).toBeInTheDocument();
		expect(container).toHaveTextContent(
			formatSecondsToDate({
				seconds: Number(1_690_000_000),
				language: get(currentLanguage),
				formatOptions: {
					hour: '2-digit',
					minute: '2-digit',
					hour12: false
				},
				timeOnly: false
			})
		);
	});
});
