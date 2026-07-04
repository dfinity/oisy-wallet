import WalletConnectActions from '$lib/components/wallet-connect/WalletConnectActions.svelte';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('WalletConnectActions', () => {
	const props = {
		onApprove: vi.fn(),
		onReject: vi.fn()
	};

	it('should enable the approve button by default', () => {
		const { getByText } = render(WalletConnectActions, { props });

		expect(getByText(en.core.text.approve).closest('button')).not.toBeDisabled();
	});

	it('should disable the approve button when approveDisabled is true', () => {
		const { getByText } = render(WalletConnectActions, {
			props: { ...props, approveDisabled: true }
		});

		expect(getByText(en.core.text.approve).closest('button')).toBeDisabled();
	});
});
