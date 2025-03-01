import BtcTransaction from '$btc/components/transactions/BtcTransaction.svelte';
import type { BtcTransactionUi } from '$btc/types/btc';
import { DEFAULT_BITCOIN_TOKEN } from '$lib/constants/tokens.constants';
import { render } from '@testing-library/svelte';

describe('BtcTransaction', () => {
	const mockTransaction: BtcTransactionUi = {
		id: 'test',
		type: 'send',
		status: 'confirmed',
		value: BigInt(40827),
		confirmations: 88822,
		from: '0xD379F3d4578DE7aC47a5928811B3407Ef03F7C49'
	};

	it('should calculate amount for send transaction correctly', () => {
		const props = {
			transaction: mockTransaction,
			token: DEFAULT_BITCOIN_TOKEN
		};

		const { getByText } = render(BtcTransaction, { props });

		expect(getByText('Send')).toBeInTheDocument();
		expect(getByText('-0.00040827')).toBeInTheDocument();
	});

	it('should calculate amount for receive transaction correctly', () => {
		const btcTransaction: BtcTransactionUi = { ...mockTransaction, type: 'receive' };

		const props = {
			transaction: btcTransaction,
			token: DEFAULT_BITCOIN_TOKEN
		};

		const { getByText } = render(BtcTransaction, { props });

		expect(getByText('Receive')).toBeInTheDocument();
		expect(getByText('+0.00040827')).toBeInTheDocument();
	});
});
