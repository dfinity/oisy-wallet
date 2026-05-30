import { goto } from '$app/navigation';
import Nft from '$lib/components/nfts/Nft.svelte';
import { FALLBACK_TIMEOUT } from '$lib/constants/app.constants';
import { AppPath } from '$lib/constants/routes.constants';
import { modalStore } from '$lib/stores/modal.store';
import { nftStore } from '$lib/stores/nft.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { getNftDisplayName } from '$lib/utils/nft.utils';
import { parseNftId } from '$lib/validation/nft.validation';
import { mockValidErc1155Nft } from '$tests/mocks/nfts.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

describe('Nft', () => {
	const mockNft = { ...mockValidErc1155Nft, name: 'Test NFT', id: parseNftId('1') };

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useRealTimers();

		modalStore.close();
		mockPage.reset();
		nftStore.resetAll();

		nftStore.addAll([mockNft]);

		mockPage.mockNft(mockNft);
	});

	it('should render the nft', () => {
		const { container, getByText } = render(Nft);

		const name: HTMLElement | null = getByText(getNftDisplayName(mockNft));

		expect(name).toBeInTheDocument();

		const imageElement: HTMLImageElement | null = container.querySelector('img');

		assertNonNullish(imageElement);

		expect(imageElement.getAttribute('src')).toContain(mockNft.imageUrl);
	});

	it('should defer fallback redirect while the manage tokens modal is open', async () => {
		vi.useFakeTimers();

		nftStore.resetAll();
		mockPage.mockNft(mockNft);
		mockPage.mockUrl(new URL('https://oisy.com/nfts?network=ic'));
		modalStore.openManageTokens({ id: Symbol() });

		const toastsErrorSpy = vi.spyOn(toastsStore, 'toastsError');

		render(Nft);

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
