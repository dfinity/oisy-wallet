import NftCollection from '$lib/components/nfts/NftCollection.svelte';
import { FALLBACK_TIMEOUT } from '$lib/constants/app.constants';
import { AppPath } from '$lib/constants/routes.constants';
import { i18n } from '$lib/stores/i18n.store';
import { modalStore } from '$lib/stores/modal.store';
import { nftStore } from '$lib/stores/nft.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { parseNftId } from '$lib/validation/nft.validation';
import { mockValidErc1155Nft } from '$tests/mocks/nfts.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

const gotoMock = vi.hoisted(() => vi.fn());

vi.mock('$app/navigation', () => ({
	goto: gotoMock
}));

describe('NftCollection', () => {
	const mockNfts = [
		{ ...mockValidErc1155Nft, name: 'Null', id: parseNftId('0') },
		{ ...mockValidErc1155Nft, name: 'Eins', id: parseNftId('1') },
		{ ...mockValidErc1155Nft, name: 'Zwei', id: parseNftId('2') }
	];

	beforeEach(() => {
		vi.clearAllMocks();
		modalStore.close();
	});

	describe('when the page has matching collection nfts', () => {
		beforeAll(() => {
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
	});

	describe('fallback redirect when the collection cannot be loaded', () => {
		const searchParams = `?collection=${mockValidErc1155Nft.collection.address}&network=ICP`;

		beforeEach(() => {
			vi.useFakeTimers();
			nftStore.resetAll();
			mockPage.reset();
			mockPage.mockUrl(new URL(`https://example.com/${searchParams}`));
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('redirects to the assets page and shows an error toast', () => {
			const toastsErrorSpy = vi.spyOn(toastsStore, 'toastsError');

			render(NftCollection);

			vi.advanceTimersByTime(FALLBACK_TIMEOUT);

			expect(gotoMock).toHaveBeenCalledExactlyOnceWith(`${AppPath.Nfts}${searchParams}`);
			expect(toastsErrorSpy).toHaveBeenCalledExactlyOnceWith({
				msg: { text: get(i18n).nfts.text.collection_not_loaded }
			});
		});

		it('does not redirect or toast while the manage-tokens modal is open', () => {
			const toastsErrorSpy = vi.spyOn(toastsStore, 'toastsError');

			modalStore.openManageTokens({ id: Symbol(), data: undefined });

			render(NftCollection);

			vi.advanceTimersByTime(FALLBACK_TIMEOUT);

			expect(gotoMock).not.toHaveBeenCalled();
			expect(toastsErrorSpy).not.toHaveBeenCalled();
		});
	});
});
