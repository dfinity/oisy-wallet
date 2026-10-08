import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import SolWalletConnectUnreadPrograms from '$sol/components/wallet-connect/SolWalletConnectUnreadPrograms.svelte';
import { STAKE_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import en from '$tests/mocks/i18n.mock';
import { mockSolAddress3 } from '$tests/mocks/sol.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('SolWalletConnectUnreadPrograms', () => {
	const props = { network: SOLANA_MAINNET_NETWORK, acknowledged: false };

	const lending = { address: mockSolAddress3, name: 'lending_app' };
	const stake = { address: STAKE_PROGRAM_ADDRESS };

	it('should say the transaction calls a program OISY cannot read', () => {
		const { getByText, queryByText } = render(SolWalletConnectUnreadPrograms, {
			props: { ...props, programs: [lending] }
		});

		expect(getByText(en.wallet_connect.text.unread_programs_one)).toBeInTheDocument();
		expect(queryByText(en.wallet_connect.text.unread_programs_other)).not.toBeInTheDocument();
	});

	it('should speak of programs when the run calls several', () => {
		const { getByText, getAllByTestId } = render(SolWalletConnectUnreadPrograms, {
			props: { ...props, programs: [lending, stake] }
		});

		expect(getByText(en.wallet_connect.text.unread_programs_other)).toBeInTheDocument();
		expect(getAllByTestId('unread-program')).toHaveLength(2);
	});

	it('should name a program by the name it publishes and by its address', () => {
		const { getByTestId } = render(SolWalletConnectUnreadPrograms, {
			props: { ...props, programs: [lending] }
		});

		const program = getByTestId('unread-program');

		expect(program).toHaveTextContent(lending.name);
		expect(program).toHaveTextContent(shortenWithMiddleEllipsis({ text: lending.address }));
	});

	it('should name a program that publishes no name by its address alone', () => {
		const { getByTestId } = render(SolWalletConnectUnreadPrograms, {
			props: { ...props, programs: [stake] }
		});

		expect(getByTestId('unread-program').textContent?.trim()).toBe(
			shortenWithMiddleEllipsis({ text: stake.address })
		);
	});

	it('should announce to a screen reader why approving waits', () => {
		// It appears once the decode settles and is the reason Approve stays unusable.
		const { getByRole } = render(SolWalletConnectUnreadPrograms, {
			props: { ...props, programs: [lending] }
		});

		expect(getByRole('alert')).toHaveTextContent(en.wallet_connect.text.unread_programs_one);
	});

	it('should start unconfirmed', () => {
		const { container } = render(SolWalletConnectUnreadPrograms, {
			props: { ...props, programs: [lending] }
		});

		expect(
			container.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked
		).toBeFalsy();
	});

	it('should be confirmed from its label', async () => {
		const { container, getByText } = render(SolWalletConnectUnreadPrograms, {
			props: { ...props, programs: [lending] }
		});

		await fireEvent.click(getByText(en.wallet_connect.text.unread_programs_acknowledge));

		expect(
			container.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked
		).toBeTruthy();
	});
});
