import { POLYGON_AMOY_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { CustomTokenSection } from '$lib/enums/custom-token-section';
import { i18n } from '$lib/stores/i18n.store';
import { nftStore } from '$lib/stores/nft.store';
import { nftSortStore } from '$lib/stores/settings.store';
import { parseNftId } from '$lib/validation/nft.validation';
import SendNftsListTestHost from '$tests/lib/components/send/SendNftsListTestHost.svelte';
import { mockValidErc1155Nft } from '$tests/mocks/nfts.mock';
import { fireEvent, render, within } from '@testing-library/svelte';
import { get } from 'svelte/store';

const mockNfts = [
	{ ...mockValidErc1155Nft, name: 'Null', id: parseNftId('0') },
	{ ...mockValidErc1155Nft, name: 'Eins', id: parseNftId('1') },
	{ ...mockValidErc1155Nft, name: 'Zwei', id: parseNftId('2') }
];

describe('SendNftsList.spec', () => {
	beforeEach(() => {
		nftStore.resetAll();
		nftSortStore.reset({ key: 'nft-sort' });
	});

	it('renders NFTs from the store', () => {
		nftStore.addAll(mockNfts);
		const { getByText, getByRole } = render(SendNftsListTestHost, {
			onSelect: vi.fn(),
			filterNetwork: undefined,
			onSelectNetwork: vi.fn()
		});

		for (const nft of mockNfts) {
			expect(getByText(`#${nft.id} – ${nft.name}`)).toBeInTheDocument();
		}

		const networkBtn = getByRole('button', { name: get(i18n).networks.chain_fusion });

		expect(networkBtn).toBeInTheDocument();
	});

	it('filters by search input (bind:filter)', async () => {
		nftStore.addAll(mockNfts);
		const { getByText, queryByText, getByPlaceholderText } = render(SendNftsListTestHost, {
			onSelect: vi.fn(),
			filterNetwork: undefined,
			onSelectNetwork: vi.fn()
		});

		const input = getByPlaceholderText(get(i18n).send.placeholder.search_nfts) as HTMLInputElement;

		await fireEvent.input(input, { target: { value: 'ein' } });

		expect(queryByText('#0 – Null')).not.toBeInTheDocument();
		expect(getByText(`#1 – Eins`)).toBeInTheDocument();
		expect(queryByText('#2 – Zwei')).not.toBeInTheDocument();
	});

	it('shows empty-state when no matches', async () => {
		nftStore.addAll(mockNfts);
		const { getByPlaceholderText, getByText, queryByText } = render(SendNftsListTestHost, {
			onSelect: vi.fn(),
			filterNetwork: undefined,
			onSelectNetwork: vi.fn()
		});

		const input = getByPlaceholderText(get(i18n).send.placeholder.search_nfts) as HTMLInputElement;
		await fireEvent.input(input, { target: { value: '___nope___' } });

		expect(getByText(get(i18n).send.text.no_nfts_found)).toBeInTheDocument();
		expect(getByText(get(i18n).send.text.no_nfts_found_desc)).toBeInTheDocument();
		expect(queryByText('Null')).not.toBeInTheDocument();
		expect(queryByText('Eins')).not.toBeInTheDocument();
		expect(queryByText('Zwei')).not.toBeInTheDocument();
	});

	it('shows filtered network name when set', async () => {
		nftStore.addAll(mockNfts);
		const onSelectNetwork = vi.fn();
		const { getByRole } = render(SendNftsListTestHost, {
			onSelect: vi.fn(),
			onSelectNetwork,
			filterNetwork: POLYGON_AMOY_NETWORK
		});

		const btn = getByRole('button', { name: POLYGON_AMOY_NETWORK.name });

		expect(btn).toBeInTheDocument();
		expect(within(btn).getByText(POLYGON_AMOY_NETWORK.name)).toBeInTheDocument();

		await fireEvent.click(btn);

		expect(onSelectNetwork).toHaveBeenCalledOnce();
	});

	it('renders NFTs that have no name', () => {
		const namelessNfts = [
			{
				...mockValidErc1155Nft,
				name: undefined,
				id: parseNftId('42'),
				collection: { ...mockValidErc1155Nft.collection, name: 'NamelessOnes' }
			}
		];

		nftStore.addAll(namelessNfts);
		const { getByText } = render(SendNftsListTestHost, {
			onSelect: vi.fn(),
			filterNetwork: undefined,
			onSelectNetwork: vi.fn()
		});

		expect(getByText('NamelessOnes')).toBeInTheDocument();
		expect(getByText('#42')).toBeInTheDocument();
	});

	const orderOf = ({
		container,
		labels
	}: {
		container: HTMLElement;
		labels: string[];
	}): string[] => {
		const text = container.textContent ?? '';
		const positions = labels.map((label) => {
			const index = text.indexOf(label);
			if (index === -1) {
				throw new Error(`Expected label not found in rendered output: ${label}`);
			}
			return { label, index };
		});
		return positions.sort((a, b) => a.index - b.index).map(({ label }) => label);
	};

	it('sorts NFTs by collection name asc by default', () => {
		const unsorted = [
			{
				...mockValidErc1155Nft,
				name: 'A',
				id: parseNftId('10'),
				collection: { ...mockValidErc1155Nft.collection, name: 'Charlie' }
			},
			{
				...mockValidErc1155Nft,
				name: 'B',
				id: parseNftId('11'),
				collection: { ...mockValidErc1155Nft.collection, name: 'Alpha' }
			},
			{
				...mockValidErc1155Nft,
				name: 'C',
				id: parseNftId('12'),
				collection: { ...mockValidErc1155Nft.collection, name: 'Bravo' }
			}
		];

		nftStore.addAll(unsorted);
		const { container } = render(SendNftsListTestHost, {
			onSelect: vi.fn(),
			filterNetwork: undefined,
			onSelectNetwork: vi.fn()
		});

		expect(orderOf({ container, labels: ['#11 – B', '#12 – C', '#10 – A'] })).toEqual([
			'#11 – B',
			'#12 – C',
			'#10 – A'
		]);
	});

	it('follows the nftSortStore (collection name desc)', () => {
		const unsorted = [
			{
				...mockValidErc1155Nft,
				name: 'A',
				id: parseNftId('10'),
				collection: { ...mockValidErc1155Nft.collection, name: 'Alpha' }
			},
			{
				...mockValidErc1155Nft,
				name: 'B',
				id: parseNftId('11'),
				collection: { ...mockValidErc1155Nft.collection, name: 'Bravo' }
			}
		];

		nftStore.addAll(unsorted);
		nftSortStore.set({
			key: 'nft-sort',
			value: { order: 'desc', type: 'collection-name' }
		});

		const { container } = render(SendNftsListTestHost, {
			onSelect: vi.fn(),
			filterNetwork: undefined,
			onSelectNetwork: vi.fn()
		});

		expect(orderOf({ container, labels: ['#10 – A', '#11 – B'] })).toEqual(['#11 – B', '#10 – A']);
	});

	it('calls onSelect when an NFT card is clicked', async () => {
		nftStore.addAll(mockNfts);
		const onSelect = vi.fn();
		const { getByText } = render(SendNftsListTestHost, {
			onSelect,
			filterNetwork: undefined,
			onSelectNetwork: vi.fn()
		});

		const nftCard = getByText('#1 – Eins');

		await fireEvent.click(nftCard);

		expect(onSelect).toHaveBeenCalledExactlyOnceWith(mockNfts[1]);
	});

	it('should not render spam or hidden nfts', async () => {
		const sectionMockNfts = [
			{
				...mockValidErc1155Nft,
				name: 'Null',
				id: parseNftId('0'),
				collection: { ...mockValidErc1155Nft.collection, section: CustomTokenSection.SPAM }
			},
			{
				...mockValidErc1155Nft,
				name: 'Eins',
				id: parseNftId('1'),
				collection: { ...mockValidErc1155Nft.collection, section: CustomTokenSection.SPAM }
			},
			{
				...mockValidErc1155Nft,
				name: 'Zwei',
				id: parseNftId('2'),
				collection: { ...mockValidErc1155Nft.collection, section: CustomTokenSection.HIDDEN }
			}
		];

		nftStore.addAll(sectionMockNfts);
		const { getByPlaceholderText, getByText, queryByText } = render(SendNftsListTestHost, {
			onSelect: vi.fn(),
			filterNetwork: undefined,
			onSelectNetwork: vi.fn()
		});

		const input = getByPlaceholderText(get(i18n).send.placeholder.search_nfts) as HTMLInputElement;
		await fireEvent.input(input, { target: { value: '___nope___' } });

		expect(getByText(get(i18n).send.text.no_nfts_found)).toBeInTheDocument();
		expect(getByText(get(i18n).send.text.no_nfts_found_desc)).toBeInTheDocument();
		expect(queryByText('Null')).not.toBeInTheDocument();
		expect(queryByText('Eins')).not.toBeInTheDocument();
		expect(queryByText('Zwei')).not.toBeInTheDocument();
	});
});
