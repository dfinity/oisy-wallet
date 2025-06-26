import IcTokenModal from '$icp/components/tokens/IcTokenModal.svelte';
import { allKnownIcrcTokensLedgerCanisterIds, enabledIcrcTokens } from '$icp/derived/icrc.derived';
import { modalStore } from '$lib/stores/modal.store';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { render } from '@testing-library/svelte';

describe('IcTokenModal', () => {
	const mockIcToken = {
		...mockValidIcrcToken,
		minterCanisterId: 'random id',
		twinToken: mockValidIcrcToken
	};
	const mockIcTokenWithIndexCanisterId = {
		...mockIcToken,
		indexCanisterId: 'random id'
	};

	beforeEach(() => {
		mockPage.reset();

		mockPage.mock({
			token: mockIcToken.name,
			network: mockIcToken.network.id.description
		});
	});

	it('displays all required values including the delete and edit buttons for IC token', () => {
		vi.spyOn(enabledIcrcTokens, 'subscribe').mockImplementation((fn) => {
			fn([mockIcToken]);
			return () => {};
		});
		const { container } = render(IcTokenModal);

		modalStore.openIcToken({ id: mockIcToken.id, data: undefined });

		expect(container).toHaveTextContent(mockIcToken.network.name);
		expect(container).toHaveTextContent(mockIcToken.name);
		expect(container).toHaveTextContent(mockIcToken.symbol);
		expect(container).toHaveTextContent(mockIcToken.twinToken?.name as string);
		expect(container).toHaveTextContent(mockIcToken.ledgerCanisterId);
		expect(container).toHaveTextContent(en.tokens.details.missing_index_canister_id_button);
		expect(container).toHaveTextContent(mockIcToken.minterCanisterId as string);
		expect(container).toHaveTextContent(`${mockIcToken.decimals}`);
		expect(container).toHaveTextContent(en.tokens.text.delete_token);
	});

	it('displays all required values without the delete and edit buttons for a default IC token', () => {
		vi.spyOn(allKnownIcrcTokensLedgerCanisterIds, 'subscribe').mockImplementation((fn) => {
			fn([mockIcTokenWithIndexCanisterId.ledgerCanisterId]);
			return () => {};
		});

		const { container } = render(IcTokenModal);

		modalStore.openIcToken({ id: mockIcTokenWithIndexCanisterId.id, data: undefined });

		expect(container).toHaveTextContent(mockIcTokenWithIndexCanisterId.network.name);
		expect(container).toHaveTextContent(mockIcTokenWithIndexCanisterId.name);
		expect(container).toHaveTextContent(mockIcTokenWithIndexCanisterId.symbol);
		expect(container).toHaveTextContent(mockIcTokenWithIndexCanisterId.twinToken?.name as string);
		expect(container).toHaveTextContent(mockIcTokenWithIndexCanisterId.ledgerCanisterId);
		expect(container).toHaveTextContent(mockIcTokenWithIndexCanisterId.indexCanisterId as string);
		expect(container).toHaveTextContent(mockIcTokenWithIndexCanisterId.minterCanisterId as string);
		expect(container).toHaveTextContent(`${mockIcTokenWithIndexCanisterId.decimals}`);
		expect(container).not.toHaveTextContent(en.tokens.text.delete_token);
	});
});
