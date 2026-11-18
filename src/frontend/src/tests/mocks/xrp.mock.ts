import type { XrpAddress } from '$xrp/types/address';
import type { XrpTrustLine } from '$xrp/types/xrp-trust-line';

export const mockXrpAddress: XrpAddress = 'rLUEXYuLiQptky37CqLcm9USQpPiz5rkpD';

export const mockXrpAddress2: XrpAddress = 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe';

// RLUSD, Ripple's USD stablecoin: the 40-hex code is the ASCII of "RLUSD", zero-padded.
export const mockRlusdCurrencyCode = '524C555344000000000000000000000000000000';

export const mockRlusdIssuer: XrpAddress = 'rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De';

export const mockXrpTrustLine: XrpTrustLine = {
	currency: mockRlusdCurrencyCode,
	issuer: mockRlusdIssuer,
	balance: '12.5',
	limit: '9999999999999999e80',
	limitPeer: '0',
	noRipple: true,
	noRipplePeer: false,
	peerAuthorized: false,
	freeze: false,
	deepFreeze: false,
	freezePeer: false,
	deepFreezePeer: false
};

// A line of `holder` with `issuer` in transaction metadata, the holder as the low side, as it is for
// RLUSD's holders: `Balance` is then the holder's own.
const mockRippleStateNode = ({
	holder,
	issuer,
	currency,
	previous,
	final
}: {
	holder: XrpAddress;
	issuer: XrpAddress;
	currency: string;
	previous: string;
	final: string;
}) => ({
	ModifiedNode: {
		LedgerEntryType: 'RippleState',
		FinalFields: {
			Balance: { currency, issuer: 'rrrrrrrrrrrrrrrrrrrrBZbvji', value: final },
			HighLimit: { currency, issuer, value: '0' },
			LowLimit: { currency, issuer: holder, value: '9999999999999999e80' },
			Flags: 1114112
		},
		PreviousFields: {
			Balance: { currency, issuer: 'rrrrrrrrrrrrrrrrrrrrBZbvji', value: previous }
		}
	}
});

/**
 * A settled payment of a trust-line token between two holders, shaped like a live RLUSD payment of
 * 0.00088 (ledger 107331031): the issuer's own account root and both holders' lines are modified,
 * each line by exactly the amount.
 */
export const mockXrpTrustLinePaymentEntry = ({
	hash = '60A95C37965FC48117501F5EEAB3378306F9C6BE858178FBBCCAC6E804A2C9F6',
	sender = 'rEhtVx4FTDKsmb1G22UyPs2riZseBzHfsw',
	receiver = 'rBi1QrVjwaNofisZAQnovoXdHkS73FG1tJ',
	currency = mockRlusdCurrencyCode,
	issuer = mockRlusdIssuer,
	value = '0.00088',
	senderPrevious = '4.0686505328',
	senderFinal = '4.0677705328',
	receiverPrevious = '96.130483',
	receiverFinal = '96.131363'
}: {
	hash?: string;
	sender?: XrpAddress;
	receiver?: XrpAddress;
	currency?: string;
	issuer?: XrpAddress;
	value?: string;
	senderPrevious?: string;
	senderFinal?: string;
	receiverPrevious?: string;
	receiverFinal?: string;
} = {}) => ({
	tx: {
		TransactionType: 'Payment',
		Account: sender,
		Destination: receiver,
		Amount: { currency, issuer, value },
		SendMax: { currency, issuer, value },
		Fee: '10',
		hash,
		ledger_index: 107331031,
		date: 844063000
	},
	meta: {
		TransactionResult: 'tesSUCCESS',
		delivered_amount: { currency, issuer, value },
		AffectedNodes: [
			{
				ModifiedNode: {
					LedgerEntryType: 'AccountRoot',
					FinalFields: { Account: issuer, Balance: '12000000' }
				}
			},
			mockRippleStateNode({
				holder: receiver,
				issuer,
				currency,
				previous: receiverPrevious,
				final: receiverFinal
			}),
			mockRippleStateNode({
				holder: sender,
				issuer,
				currency,
				previous: senderPrevious,
				final: senderFinal
			})
		]
	},
	validated: true
});
