import { combinedDerivedSortedFungibleNetworkTokensUi } from '$lib/derived/network-tokens.derived';
import { showZeroBalances } from '$lib/derived/settings.derived';
import { userProfileStore } from '$lib/stores/user-profile.store';
import type { TokenUiOrGroupUi } from '$lib/types/token-group';
import { filterTokenGroups, groupTokensByTwin } from '$lib/utils/token-group.utils';
import TokensDisplayHandlerTest from '$tests/lib/components/tokens/TokensDisplayHandlerTest.svelte';
import {
	mockNetworksSettings,
	mockUserProfile,
	mockUserSettings
} from '$tests/mocks/user-profile.mock';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import { toNullable } from '@dfinity/utils';
import { fireEvent, render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { get } from 'svelte/store';

vi.mock(import('$lib/utils/token-group.utils'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		groupTokensByTwin: vi
			.fn<typeof groupTokensByTwin>()
			.mockImplementation((tokens) => tokens.map((token) => ({ token }))),
		filterTokenGroups: vi
			.fn<typeof filterTokenGroups>()
			.mockImplementation(({ groupedTokens }) => groupedTokens)
	};
});

describe('TokensDisplayHandler', () => {
	const childTestId = 'child-test-id';
	const tokenCountTestId = 'token-count-test-id';
	const buttonTestId = 'button-test-id';

	const props = {
		childTestId,
		tokenCountTestId,
		buttonTestId
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should apply tokens immediately when animating is false', () => {
		const initial = get(combinedDerivedSortedFungibleNetworkTokensUi);

		const { getByTestId } = render(TokensDisplayHandlerTest, {
			props: { ...props, animating: false }
		});

		const count = getByTestId(tokenCountTestId);

		expect(count.textContent).toBe(initial.length.toString());
	});

	it('should defer applying while animating is true, then apply after animation stops', async () => {
		vi.useFakeTimers();

		const initial = get(combinedDerivedSortedFungibleNetworkTokensUi);

		const { getByTestId } = render(TokensDisplayHandlerTest, {
			props: { ...props, animating: true }
		});

		// While animating, tokens should NOT be applied yet
		const count = getByTestId(tokenCountTestId);

		expect(count.textContent).toBe('0');

		// Advance one retry tick (500ms) — still animating, so still deferred
		await vi.advanceTimersByTimeAsync(500);

		expect(count.textContent).toBe('0');

		const stopBtn = getByTestId(buttonTestId);

		await fireEvent.click(stopBtn);

		// The component scheduled a retry previously; advance time to let it run
		await vi.advanceTimersByTimeAsync(500);

		expect(count.textContent).toBe(initial.length.toString());

		vi.useRealTimers();
	});

	it('should call the utils functions with the correct arguments', async () => {
		const initial = get(combinedDerivedSortedFungibleNetworkTokensUi);
		const expected: TokenUiOrGroupUi[] = initial.map((token) => ({ token }));

		render(TokensDisplayHandlerTest, {
			props: { ...props, animating: false }
		});

		expect(groupTokensByTwin).toHaveBeenCalledExactlyOnceWith(initial);

		expect(filterTokenGroups).toHaveBeenCalledExactlyOnceWith({
			groupedTokens: expected,
			showZeroBalances: get(showZeroBalances)
		});

		setupUserNetworksStore('allDisabled');
		userProfileStore.set({
			certified: false,
			profile: {
				...mockUserProfile,
				settings: toNullable({
					...mockUserSettings,
					networks: {
						...mockNetworksSettings,
						testnets: { show_testnets: true },
						networks: [
							[{ EthereumMainnet: null }, { enabled: false, is_testnet: false }],
							[{ BaseMainnet: null }, { enabled: false, is_testnet: false }],
							[{ BscMainnet: null }, { enabled: false, is_testnet: false }],
							[{ PolygonMainnet: null }, { enabled: false, is_testnet: false }],
							[{ ArbitrumMainnet: null }, { enabled: false, is_testnet: false }],
							[{ SolanaMainnet: null }, { enabled: true, is_testnet: false }]
						]
					}
				})
			}
		});

		await tick();

		const newTokens = get(combinedDerivedSortedFungibleNetworkTokensUi);
		const newExpected: TokenUiOrGroupUi[] = newTokens.map((token) => ({ token }));

		expect(newTokens).not.toHaveLength(initial.length);

		expect(groupTokensByTwin).toHaveBeenCalledTimes(2);
		expect(groupTokensByTwin).toHaveBeenNthCalledWith(1, initial);
		expect(groupTokensByTwin).toHaveBeenNthCalledWith(2, newTokens);

		expect(filterTokenGroups).toHaveBeenCalledTimes(2);
		expect(filterTokenGroups).toHaveBeenNthCalledWith(1, {
			groupedTokens: expected,
			showZeroBalances: get(showZeroBalances)
		});
		expect(filterTokenGroups).toHaveBeenNthCalledWith(2, {
			groupedTokens: newExpected,
			showZeroBalances: get(showZeroBalances)
		});
	});
});
