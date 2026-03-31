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
import { ckMinterPrincipalBuiltInContacts } from '$icp-eth/utils/ck-minter-principal-contacts.utils';
import { ZERO } from '$lib/constants/app.constants';
import { nonNullish } from '@dfinity/utils';

describe('ck-minter-principal-contacts.utils', () => {
	describe('ckMinterPrincipalBuiltInContacts', () => {
		it('should always include mainnet ckBTC and ckETH minter contacts', () => {
			const names = ckMinterPrincipalBuiltInContacts.map(({ name }) => name);

			expect(names).toContain('ckBTC Minter');
			expect(names).toContain('ckETH Minter');
		});

		it('should use Icrcv2 address type for all contacts', () => {
			for (const contact of ckMinterPrincipalBuiltInContacts) {
				expect(contact.addresses).toHaveLength(1);
				expect(contact.addresses[0].addressType).toBe('Icrcv2');
			}
		});

		it('should use the correct canister IDs as addresses', () => {
			const ckBtcContact = ckMinterPrincipalBuiltInContacts.find(
				({ name }) => name === 'ckBTC Minter'
			);
			const ckEthContact = ckMinterPrincipalBuiltInContacts.find(
				({ name }) => name === 'ckETH Minter'
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
				({ name }) => name === 'ckBTC Minter (Testnet)'
			);
			const hasStagingEth = ckMinterPrincipalBuiltInContacts.some(
				({ name }) => name === 'ckETH Minter (Testnet)'
			);

			expect(hasStagingBtc).toBe(nonNullish(STAGING_CKBTC_MINTER_CANISTER_ID));
			expect(hasStagingEth).toBe(nonNullish(STAGING_CKETH_MINTER_CANISTER_ID));
		});

		it('should include local contacts only when local canister IDs are defined', () => {
			const hasLocalBtc = ckMinterPrincipalBuiltInContacts.some(
				({ name }) => name === 'ckBTC Minter (Local)'
			);
			const hasLocalEth = ckMinterPrincipalBuiltInContacts.some(
				({ name }) => name === 'ckETH Minter (Local)'
			);

			expect(hasLocalBtc).toBe(nonNullish(LOCAL_CKBTC_MINTER_CANISTER_ID));
			expect(hasLocalEth).toBe(nonNullish(LOCAL_CKETH_MINTER_CANISTER_ID));
		});
	});
});
