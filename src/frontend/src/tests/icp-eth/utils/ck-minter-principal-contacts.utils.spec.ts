import {
	IC_CKBTC_MINTER_CANISTER_ID,
	LOCAL_CKBTC_MINTER_CANISTER_ID,
	STAGING_CKBTC_MINTER_CANISTER_ID
} from '$env/tokens/tokens-icrc/tokens.icrc.ck.btc.env';
import {
	IC_CKETH_MINTER_CANISTER_ID,
	LOCAL_CKETH_MINTER_CANISTER_ID,
	STAGING_CKETH_MINTER_CANISTER_ID
} from '$env/tokens/tokens-icrc/tokens.icrc.ck.eth.env';
import { CK_ETHEREUM_MINTER_DISPLAY_NAME } from '$icp-eth/utils/ck-minter-contacts.utils';
import {
	CKBTC_MINTER_DISPLAY_NAME,
	ckMinterPrincipalBuiltInContacts
} from '$icp-eth/utils/ck-minter-principal-contacts.utils';
import { ZERO } from '$lib/constants/app.constants';
import { nonNullish } from '@dfinity/utils';

describe('ck-minter-principal-contacts.utils', () => {
	describe('ckMinterPrincipalBuiltInContacts', () => {
		it('should always include mainnet ckBTC and ckETH minter contacts', () => {
			const names = ckMinterPrincipalBuiltInContacts.map(({ name }) => name);

			expect(names).toContain(CKBTC_MINTER_DISPLAY_NAME);
			expect(names).toContain(CK_ETHEREUM_MINTER_DISPLAY_NAME);
		});

		it('should use Icrcv2 address type for all contacts', () => {
			for (const contact of ckMinterPrincipalBuiltInContacts) {
				expect(contact.addresses).toHaveLength(1);
				expect(contact.addresses[0].addressType).toBe('Icrcv2');
			}
		});

		it('should use the correct canister IDs as addresses', () => {
			const ckBtcContact = ckMinterPrincipalBuiltInContacts.find(
				({ name }) => name === CKBTC_MINTER_DISPLAY_NAME
			);
			const ckEthContact = ckMinterPrincipalBuiltInContacts.find(
				({ name }) => name === CK_ETHEREUM_MINTER_DISPLAY_NAME
			);

			expect(ckBtcContact?.addresses[0].address).toBe(IC_CKBTC_MINTER_CANISTER_ID);
			expect(ckEthContact?.addresses[0].address).toBe(IC_CKETH_MINTER_CANISTER_ID);
		});

		it('should use negative IDs based on the principal contact base', () => {
			for (const contact of ckMinterPrincipalBuiltInContacts) {
				expect(contact.id).toBeLessThan(-199_999n);
			}
		});

		it('should assign unique IDs to all contacts', () => {
			const ids = ckMinterPrincipalBuiltInContacts.map(({ id }) => id);

			expect(new Set(ids).size).toBe(ids.length);
		});

		it('should set updateTimestampNs to zero', () => {
			for (const contact of ckMinterPrincipalBuiltInContacts) {
				expect(contact.updateTimestampNs).toBe(ZERO);
			}
		});

		it('should include staging contacts only when staging canister IDs are defined', () => {
			const hasStagingBtc = ckMinterPrincipalBuiltInContacts.some(
				({ name }) => name === `${CKBTC_MINTER_DISPLAY_NAME} (Testnet)`
			);
			const hasStagingEth = ckMinterPrincipalBuiltInContacts.some(
				({ name }) => name === `${CK_ETHEREUM_MINTER_DISPLAY_NAME} (Testnet)`
			);

			expect(hasStagingBtc).toBe(nonNullish(STAGING_CKBTC_MINTER_CANISTER_ID));
			expect(hasStagingEth).toBe(nonNullish(STAGING_CKETH_MINTER_CANISTER_ID));
		});

		it('should include local contacts only when local canister IDs are defined', () => {
			const hasLocalBtc = ckMinterPrincipalBuiltInContacts.some(
				({ name }) => name === `${CKBTC_MINTER_DISPLAY_NAME} (Local)`
			);
			const hasLocalEth = ckMinterPrincipalBuiltInContacts.some(
				({ name }) => name === `${CK_ETHEREUM_MINTER_DISPLAY_NAME} (Local)`
			);

			expect(hasLocalBtc).toBe(nonNullish(LOCAL_CKBTC_MINTER_CANISTER_ID));
			expect(hasLocalEth).toBe(nonNullish(LOCAL_CKETH_MINTER_CANISTER_ID));
		});
	});
});
