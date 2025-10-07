import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import SendSource from '$lib/components/send/SendSource.svelte';
import { contactsStore } from '$lib/stores/contacts.store';
import type { ContactUi } from '$lib/types/contact';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';

describe('SendSource', () => {
	const props = {
		token: BTC_MAINNET_TOKEN,
		balance: 22000000n,
		source: mockEthAddress
	};

	const sourceSelector = 'div[id="source"]';
	const balanceSelector = 'div[id="balance"]';

	const contact: ContactUi = {
		id: BigInt(1),
		name: 'Pre-existing Contact',
		updateTimestampNs: BigInt(Date.now()),
		addresses: [
			{
				address: mockEthAddress,
				label: 'Test Label',
				addressType: 'Eth'
			}
		]
	};

	beforeEach(() => {
		contactsStore.reset();
		contactsStore.set([contact]);
	});

	it('should render all fields with values', () => {
		const { container } = render(SendSource, { props });

		const source: HTMLDivElement | null = container.querySelector(sourceSelector);
		const balance: HTMLDivElement | null = container.querySelector(balanceSelector);

		expect(source).toHaveTextContent(mockEthAddress);
		expect(balance?.textContent).toContain('0.22');
		expect(balance?.textContent).toContain('BTC');
	});

	it('should render all field but balance without value', () => {
		const { container } = render(SendSource, { ...props, token: undefined });

		const source: HTMLDivElement | null = container.querySelector(sourceSelector);
		const balance: HTMLDivElement | null = container.querySelector(balanceSelector);

		expect(source).toHaveTextContent(mockEthAddress);
		expect(balance?.textContent).toBe('\u200B');
	});

	it('should render the contact if it is saved', () => {
		const { container } = render(SendSource, { ...props, token: undefined });

		const source: HTMLDivElement | null = container.querySelector(sourceSelector);

		assertNonNullish(contact.addresses[0].label);

		expect(source).toHaveTextContent(contact.name);
		expect(source).toHaveTextContent(contact.addresses[0].label);
	});

	it('should not render the contact if it is not saved', () => {
		contactsStore.reset();

		const { container } = render(SendSource, { ...props, token: undefined });

		const source: HTMLDivElement | null = container.querySelector(sourceSelector);

		assertNonNullish(contact.addresses[0].label);

		expect(source).not.toHaveTextContent(contact.name);
		expect(source).not.toHaveTextContent(contact.addresses[0].label);
	});
});
