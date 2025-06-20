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
		indexCanisterId: 'random id',
		minterCanisterId: 'random id',
		twinToken: mockValidIcrcToken
	};

	beforeEach(() => {
		mockPage.reset();

		vi.spyOn(enabledIcrcTokens, 'subscribe').mockImplementation((fn) => {
			fn([mockIcToken]);
			return () => {};
		});
		mockPage.mock({
			token: mockIcToken.name,
			network: mockIcToken.network.id.description
		});
	});

	it('displays all required values including the delete button for IC token', () => {
		const { container } = render(IcTokenModal);

		modalStore.openIcToken({ id: mockIcToken.id, data: undefined });

		expect(container).toHaveTextContent(mockIcToken.network.name);
		expect(container).toHaveTextContent(mockIcToken.name);
		expect(container).toHaveTextContent(mockIcToken.symbol);
		expect(container).toHaveTextContent(mockIcToken.twinToken?.name as string);
		expect(container).toHaveTextContent(mockIcToken.ledgerCanisterId);
		expect(container).toHaveTextContent(mockIcToken.indexCanisterId as string);
		expect(container).toHaveTextContent(mockIcToken.minterCanisterId as string);
		expect(container).toHaveTextContent(`${mockIcToken.decimals}`);
		expect(container).toHaveTextContent(en.tokens.text.delete_token);
	});

	it('displays all required values without the delete button for a default IC token', () => {
		vi.spyOn(allKnownIcrcTokensLedgerCanisterIds, 'subscribe').mockImplementation((fn) => {
			fn([mockIcToken.ledgerCanisterId]);
			return () => {};
		});

		const { container } = render(IcTokenModal);

		modalStore.openIcToken({ id: mockIcToken.id, data: undefined });

		expect(container).toHaveTextContent(mockIcToken.network.name);
		expect(container).toHaveTextContent(mockIcToken.name);
		expect(container).toHaveTextContent(mockIcToken.symbol);
		expect(container).toHaveTextContent(mockIcToken.twinToken?.name as string);
		expect(container).toHaveTextContent(mockIcToken.ledgerCanisterId);
		expect(container).toHaveTextContent(mockIcToken.indexCanisterId as string);
		expect(container).toHaveTextContent(mockIcToken.minterCanisterId as string);
		expect(container).toHaveTextContent(`${mockIcToken.decimals}`);
		expect(container).not.toHaveTextContent(en.tokens.text.delete_token);
	});
});
