import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import IcTokenModal from '$icp/components/tokens/IcTokenModal.svelte';
import { enabledIcrcTokens } from '$icp/derived/icrc.derived';
import type { IcCkToken } from '$icp/types/ic-token';
import { modalStore } from '$lib/stores/modal.store';
import { mockValidIcCkToken } from '$tests/mocks/ic-tokens.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { render } from '@testing-library/svelte';

describe('IcTokenModal', () => {
	const mockIcCkToken = {
		...mockValidIcCkToken,
		name: 'ckBTC',
		symbol: BTC_MAINNET_TOKEN.twinTokenSymbol,
		ledgerCanisterId: 'random id',
		indexCanisterId: 'random id',
		twinToken: BTC_MAINNET_TOKEN
	} as IcCkToken;

	beforeEach(() => {
		mockPage.reset();
	});

	it('displays all required values', () => {
		vi.spyOn(enabledIcrcTokens, 'subscribe').mockImplementation((fn) => {
			fn([mockIcCkToken]);
			return () => {};
		});

		mockPage.mock({
			token: mockIcCkToken.name,
			network: mockIcCkToken.network.id.description
		});

		const { container } = render(IcTokenModal);

		modalStore.openBtcToken({ id: mockIcCkToken.id, data: undefined });

		expect(container).toHaveTextContent(mockIcCkToken.network.name);
		expect(container).toHaveTextContent(mockIcCkToken.name);
		expect(container).toHaveTextContent(mockIcCkToken.symbol);
		expect(container).toHaveTextContent(mockIcCkToken.twinToken?.name as string);
		expect(container).toHaveTextContent(mockIcCkToken.ledgerCanisterId);
		expect(container).toHaveTextContent(mockIcCkToken.indexCanisterId as string);
		expect(container).toHaveTextContent(mockIcCkToken.minterCanisterId as string);
		expect(container).toHaveTextContent(`${mockIcCkToken.decimals}`);
	});
});
