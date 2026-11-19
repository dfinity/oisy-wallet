import { cmcDepositAccountCanisterIds } from '$icp/derived/cycles-top-up.derived';
import { getCmcDepositAccountIdentifier } from '$icp/utils/cmc.utils';
import { contactsStore } from '$lib/stores/contacts.store';
import type { ContactUi } from '$lib/types/contact';
import { mockAccountIdentifierText, mockPrincipalText } from '$tests/mocks/identity.mock';
import { Principal } from '@icp-sdk/core/principal';
import { get } from 'svelte/store';

describe('cycles-top-up.derived', () => {
	describe('cmcDepositAccountCanisterIds', () => {
		const canister = 'ywcsb-maaaa-aaaai-q6k7a-cai';
		const otherCanister = 'um5iw-rqaaa-aaaaq-qaaba-cai';

		const contact = ({ id, addresses }: Pick<ContactUi, 'id' | 'addresses'>): ContactUi => ({
			id,
			name: `Contact ${id}`,
			updateTimestampNs: 12n,
			addresses,
			image: undefined
		});

		const depositAccount = (canisterId: string): string =>
			getCmcDepositAccountIdentifier(Principal.fromText(canisterId)).toLowerCase();

		beforeEach(() => {
			contactsStore.set([]);
		});

		it('is empty without contacts', () => {
			expect(get(cmcDepositAccountCanisterIds)).toEqual({});
		});

		it('keys every contact canister by the CMC deposit account a top-up to it pays into', () => {
			contactsStore.set([
				contact({
					id: 1n,
					addresses: [
						{ addressType: 'Icrcv2', address: canister },
						{ addressType: 'Icrcv2', address: mockPrincipalText },
						{ addressType: 'Icrcv2', address: mockAccountIdentifierText }
					]
				}),
				contact({ id: 2n, addresses: [{ addressType: 'Icrcv2', address: otherCanister }] })
			]);

			expect(get(cmcDepositAccountCanisterIds)).toEqual({
				[depositAccount(canister)]: canister,
				[depositAccount(otherCanister)]: otherCanister
			});
		});
	});
});
