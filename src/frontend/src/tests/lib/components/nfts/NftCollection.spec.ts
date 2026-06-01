import { goto } from '$app/navigation';
import NftCollection from '$lib/components/nfts/NftCollection.svelte';
import { FALLBACK_TIMEOUT } from '$lib/constants/app.constants';
import { AppPath } from '$lib/constants/routes.constants';
import { modalStore } from '$lib/stores/modal.store';
import { nftStore } from '$lib/stores/nft.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { parseNftId } from '$lib/validation/nft.validation';
import { mockValidErc1155Nft } from '$tests/mocks/nfts.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

describe('NftCollection', () => {
	const mockNfts = [
		{ ...mockValidErc1155Nft, name: 'Null', id: parseNftId('0') },
		{ ...mockValidErc1155Nft, name: 'Eins', id: parseNftId('1') },
		{ ...mockValidErc1155Nft, name: 'Zwei', id: parseNftId('2') }
	];

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useRealTimers();

		modalStore.close();
		mockPage.reset();
		nftStore.resetAll();

		nftStore.addAll(mockNfts);

		mockPage.mockCollection(mockValidErc1155Nft.collection);
	});

	it('should render a list of the collections nfts', () => {
		const { container } = render(NftCollection);

		const grid = container.querySelector('.grid');

		assertNonNullish(grid);

		const links = grid.querySelectorAll('a');

		assertNonNullish(links);

		for (let i = 0; i < links.length; i++) {
			expect(links.item(i).getAttribute('href')).toContain(
				`${AppPath.Nfts}${mockValidErc1155Nft.collection.network.name}-${mockValidErc1155Nft.collection.address}/${mockNfts[i].id}`
			);

			const img = links.item(i).querySelector('.bg-cover');

			assertNonNullish(img);

			expect(img.getAttribute('style')).toContain(
				`background-image: url("${mockNfts[i].imageUrl}")`
			);
		}
	});

	it('should defer fallback redirect while the manage tokens modal is open', async () => {
		vi.useFakeTimers();

		nftStore.resetAll();
		mockPage.mockCollection(mockValidErc1155Nft.collection);
		mockPage.mockUrl(new URL('https://oisy.com/nfts?network=ic'));
		modalStore.openManageTokens({ id: Symbol() });

		const toastsErrorSpy = vi.spyOn(toastsStore, 'toastsError');

		render(NftCollection);
		await tick();

		await vi.advanceTimersByTimeAsync(FALLBACK_TIMEOUT);

		expect(goto).not.toHaveBeenCalled();
		expect(toastsErrorSpy).not.toHaveBeenCalled();

		modalStore.close();
		await tick();
		await vi.advanceTimersByTimeAsync(FALLBACK_TIMEOUT);

		expect(goto).toHaveBeenCalledExactlyOnceWith(`${AppPath.Nfts}?network=ic`);
		expect(toastsErrorSpy).toHaveBeenCalledOnce();
	});
});
