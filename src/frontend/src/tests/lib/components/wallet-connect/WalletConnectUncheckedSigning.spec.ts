import WalletConnectUncheckedSigning from '$lib/components/wallet-connect/WalletConnectUncheckedSigning.svelte';
import {
	WALLET_CONNECT_UNCHECKED_SIGNING_ACKNOWLEDGE,
	WALLET_CONNECT_UNCHECKED_SIGNING_OPEN_SETTINGS,
	WALLET_CONNECT_UNCHECKED_SIGNING_POINTER
} from '$lib/constants/test-ids.constants';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('WalletConnectUncheckedSigning', () => {
	const props = {
		acknowledged: false,
		onAcknowledge: vi.fn(),
		onOpenSettings: vi.fn()
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('with the Settings switch on', () => {
		it('asks the user to acknowledge signing what OISY cannot show', async () => {
			const { getByTestId, getByText, queryByTestId } = render(WalletConnectUncheckedSigning, {
				props: { ...props, offered: true }
			});

			expect(getByTestId(WALLET_CONNECT_UNCHECKED_SIGNING_ACKNOWLEDGE)).toBeInTheDocument();
			expect(queryByTestId(WALLET_CONNECT_UNCHECKED_SIGNING_POINTER)).not.toBeInTheDocument();

			await fireEvent.click(getByText(en.wallet_connect.text.unchecked_signing_acknowledge));

			expect(props.onAcknowledge).toHaveBeenCalledOnce();
		});

		it('shows the box as it was left', () => {
			const { getByRole } = render(WalletConnectUncheckedSigning, {
				props: { ...props, offered: true, acknowledged: true }
			});

			expect((getByRole('checkbox') as HTMLInputElement).checked).toBeTruthy();
		});
	});

	describe('with the Settings switch off', () => {
		it('says where the switch is and offers to go there', async () => {
			const { getByTestId, getByText, queryByTestId } = render(WalletConnectUncheckedSigning, {
				props: { ...props, offered: false }
			});

			expect(getByText(en.wallet_connect.text.unchecked_signing_pointer)).toBeInTheDocument();
			expect(queryByTestId(WALLET_CONNECT_UNCHECKED_SIGNING_ACKNOWLEDGE)).not.toBeInTheDocument();

			await fireEvent.click(getByTestId(WALLET_CONNECT_UNCHECKED_SIGNING_OPEN_SETTINGS));

			expect(props.onOpenSettings).toHaveBeenCalledOnce();
		});
	});
});
