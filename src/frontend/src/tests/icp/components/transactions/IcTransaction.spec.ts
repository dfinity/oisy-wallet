import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import IcTransaction from '$icp/components/transactions/IcTransaction.svelte';
import { getCmcDepositAccountIdentifier } from '$icp/utils/cmc.utils';
import { mapCyclesLedgerTransaction } from '$icp/utils/cycles-ledger-transactions.utils';
import { EIGHT_DECIMALS, ZERO } from '$lib/constants/app.constants';
import { contactsStore } from '$lib/stores/contacts.store';
import { i18n } from '$lib/stores/i18n.store';
import { formatToken, shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { getTokenDisplaySymbol } from '$lib/utils/token.utils';
import { bn1Bi } from '$tests/mocks/balances.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import {
	createMockIcrcBurnTransaction,
	createMockIcTransactionsUi
} from '$tests/mocks/ic-transactions.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { assertNonNullish } from '@dfinity/utils';
import { encodeIcrcAccount } from '@icp-sdk/canisters/ledger/icrc';
import { Principal } from '@icp-sdk/core/principal';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('IcTransaction', () => {
	const [mockTrx] = createMockIcTransactionsUi(1);

	it('should render correct amount for send transactions', () => {
		const { container } = render(IcTransaction, {
			props: {
				transaction: { ...mockTrx, value: 12345n, type: 'send' },
				token: ICP_TOKEN
			}
		});

		const amountElement = container.querySelector('span.text-right>span');

		assertNonNullish(amountElement);

		expect(amountElement.textContent).toBe(
			`${formatToken({
				value: -12345n - bn1Bi,
				displayDecimals: EIGHT_DECIMALS,
				unitName: ICP_TOKEN.decimals,
				showPlusSign: false
			})} ${getTokenDisplaySymbol(ICP_TOKEN)}`
		);
	});

	it('should render correct amount for receive transactions', () => {
		const { container } = render(IcTransaction, {
			props: {
				transaction: { ...mockTrx, value: 12345n, fee: ZERO, type: 'receive', incoming: true },
				token: ICP_TOKEN
			}
		});

		const amountElement = container.querySelector('span.text-right>span');

		assertNonNullish(amountElement);

		expect(amountElement.textContent).toBe(
			`${formatToken({
				value: 12345n,
				displayDecimals: EIGHT_DECIMALS,
				unitName: ICP_TOKEN.decimals,
				showPlusSign: true
			})} ${getTokenDisplaySymbol(ICP_TOKEN)}`
		);
	});

	it('should render correct amount for approve transactions', () => {
		const { container } = render(IcTransaction, {
			props: {
				transaction: { ...mockTrx, value: 12345n, fee: 5000n, type: 'approve' },
				token: ICP_TOKEN
			}
		});

		const amountElement = container.querySelector('span.text-right>span');

		assertNonNullish(amountElement);

		expect(amountElement.textContent).toBe(
			`${formatToken({
				value: -5000n,
				displayDecimals: EIGHT_DECIMALS,
				unitName: ICP_TOKEN.decimals,
				showPlusSign: false
			})} ${getTokenDisplaySymbol(ICP_TOKEN)}`
		);
	});

	it('should render correct label for approve transactions including full allowance amount', () => {
		const { container } = render(IcTransaction, {
			props: {
				transaction: { ...mockTrx, value: 12345n, type: 'approve' },
				token: ICP_TOKEN
			}
		});

		const labelElement = container.querySelector('span.basis-0 span.truncate');

		assertNonNullish(labelElement);

		expect(labelElement.textContent).toBe(
			`${replacePlaceholders(get(i18n).transaction.text.approve_label, {
				$approveAmount: formatToken({
					value: 12345n,
					displayDecimals: EIGHT_DECIMALS,
					unitName: ICP_TOKEN.decimals,
					showPlusSign: false
				})
			})} ${getTokenDisplaySymbol(ICP_TOKEN)}`
		);
	});

	it('should show minting account as "from" for mint transactions', () => {
		assertNonNullish(mockValidIcToken.mintingAccount);

		const mintingAddress = encodeIcrcAccount(mockValidIcToken.mintingAccount);

		const { container } = render(IcTransaction, {
			props: {
				transaction: { ...mockTrx, type: 'mint', incoming: true },
				token: mockValidIcToken
			}
		});

		expect(container).toHaveTextContent(shortenWithMiddleEllipsis({ text: mintingAddress }));
	});

	it('should show minting account as "to" for burn transactions', () => {
		assertNonNullish(mockValidIcToken.mintingAccount);

		const mintingAddress = encodeIcrcAccount(mockValidIcToken.mintingAccount);

		const { container } = render(IcTransaction, {
			props: {
				transaction: { ...mockTrx, type: 'burn', incoming: false },
				token: mockValidIcToken
			}
		});

		expect(container).toHaveTextContent(shortenWithMiddleEllipsis({ text: mintingAddress }));
	});

	it('should show a top-up with its label and canister', () => {
		const canister = 'ywcsb-maaaa-aaaai-q6k7a-cai';

		const transaction = mapCyclesLedgerTransaction({
			transaction: createMockIcrcBurnTransaction({
				memo: Uint8Array.from([0x81, 0x4a, ...Principal.fromText(canister).toUint8Array()])
			}),
			identity: mockIdentity
		});

		// The cycles ledger has no minting account, so a burn names its own destination.
		const { mintingAccount: _, ...cyclesLedgerToken } = mockValidIcToken;

		const { container } = render(IcTransaction, {
			props: {
				transaction,
				token: cyclesLedgerToken
			}
		});

		expect(container).toHaveTextContent(get(i18n).transaction.label.top_up);
		expect(container).toHaveTextContent(get(i18n).transaction.text.canister);
		expect(container).not.toHaveTextContent(/\bTo\b/);
		expect(container).toHaveTextContent(shortenWithMiddleEllipsis({ text: canister }));
	});

	describe('ICP top-ups', () => {
		const canister = 'ywcsb-maaaa-aaaai-q6k7a-cai';

		const depositAccount = getCmcDepositAccountIdentifier(Principal.fromText(canister));

		const topUp = {
			...mockTrx,
			type: 'send' as const,
			typeLabel: 'transaction.label.top_up',
			to: depositAccount
		};

		beforeEach(() => {
			contactsStore.set([]);
		});

		it('should call the canister unknown and never show the CMC deposit account', () => {
			const { container } = render(IcTransaction, {
				props: { transaction: topUp, token: ICP_TOKEN }
			});

			expect(container).toHaveTextContent(get(i18n).transaction.label.top_up);
			expect(container).toHaveTextContent(get(i18n).transaction.text.canister);
			expect(container).toHaveTextContent(get(i18n).transaction.text.canister_unknown);
			expect(container).not.toHaveTextContent(shortenWithMiddleEllipsis({ text: depositAccount }));
		});

		it('should name the canister when a contact holds the one whose deposit account it paid', () => {
			contactsStore.set([
				{
					id: 1n,
					name: 'OISY Prod',
					updateTimestampNs: 12n,
					addresses: [{ addressType: 'Icrcv2', address: canister }],
					image: undefined
				}
			]);

			const { container } = render(IcTransaction, {
				props: { transaction: topUp, token: ICP_TOKEN }
			});

			expect(container).toHaveTextContent('OISY Prod');
			expect(container).not.toHaveTextContent(get(i18n).transaction.text.canister_unknown);
			expect(container).not.toHaveTextContent(shortenWithMiddleEllipsis({ text: depositAccount }));
		});
	});
});
