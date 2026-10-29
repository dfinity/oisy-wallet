import { CMC_MINT_CYCLES_MEMO, CMC_TOP_UP_MEMO } from '$icp/constants/cmc.constants';
import type { IcpTransaction } from '$icp/types/ic-transaction';
import { getAccountIdentifier } from '$icp/utils/icp-account.utils';
import { mapIcpTransaction } from '$icp/utils/icp-transactions.utils';
import { ZERO } from '$lib/constants/app.constants';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';

const OWN_ACCOUNT_IDENTIFIER = getAccountIdentifier(mockPrincipal).toHex();
const OTHER_ACCOUNT_IDENTIFIER = 'a1b2c3';

const transfer = ({
	from = OWN_ACCOUNT_IDENTIFIER,
	to = OTHER_ACCOUNT_IDENTIFIER,
	memo = ZERO,
	icrc1Memo
}: {
	from?: string;
	to?: string;
	memo?: bigint;
	icrc1Memo?: Uint8Array;
}): IcpTransaction => ({
	id: 7n,
	transaction: {
		memo,
		icrc1_memo: icrc1Memo === undefined ? [] : [icrc1Memo],
		operation: {
			Transfer: {
				from,
				to,
				amount: { e8s: 100_000_000n },
				fee: { e8s: 10_000n },
				spender: []
			}
		},
		timestamp: [{ timestamp_nanos: 1_790_000_000_000_000_000n }],
		created_at_time: []
	}
});

describe('icp-transactions.utils', () => {
	describe('mapIcpTransaction', () => {
		it.each([
			{ label: 'with the ICRC-1 memo', transaction: transfer({ icrc1Memo: CMC_TOP_UP_MEMO }) },
			{ label: 'with the legacy memo', transaction: transfer({ memo: 0x50555054n }) }
		])('labels an outgoing top-up through the CMC $label', ({ transaction }) => {
			const mapped = mapIcpTransaction({ transaction, identity: mockIdentity });

			expect(mapped).toEqual(
				expect.objectContaining({
					type: 'send',
					typeLabel: 'transaction.label.top_up',
					to: OTHER_ACCOUNT_IDENTIFIER
				})
			);
		});

		it.each([
			{
				label: 'an incoming transfer with the top-up memo',
				transaction: transfer({
					from: OTHER_ACCOUNT_IDENTIFIER,
					to: OWN_ACCOUNT_IDENTIFIER,
					icrc1Memo: CMC_TOP_UP_MEMO
				})
			},
			{ label: 'a mint deposit', transaction: transfer({ icrc1Memo: CMC_MINT_CYCLES_MEMO }) },
			{ label: 'an ordinary send', transaction: transfer({}) }
		])('does not label $label', ({ transaction }) => {
			expect(mapIcpTransaction({ transaction, identity: mockIdentity }).typeLabel).toBeUndefined();
		});
	});
});
