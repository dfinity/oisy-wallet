import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import {
	estimateCyclesTopUpCycles,
	formatTrillionCycles,
	getCanisterNetworkContacts,
	getRecentlyToppedUpCanisters,
	isCanisterAccount,
	isCanisterId,
	isCyclesTopUpTokenUsable,
	parseCanisterId
} from '$icp/utils/cycles-top-up.utils';
import { ZERO } from '$lib/constants/app.constants';
import type { ContactUi } from '$lib/types/contact';
import { getNetworkContactKey } from '$lib/utils/contact.utils';
import { mockContactEthAddressUi } from '$tests/mocks/contacts.mock';
import { mockTcyclesToken } from '$tests/mocks/cycles-mint.mock';
import {
	mockAccountIdentifierText,
	mockPrincipal,
	mockPrincipalText
} from '$tests/mocks/identity.mock';
import { encodeIcrcAccount } from '@icp-sdk/canisters/ledger/icrc';
import { Principal } from '@icp-sdk/core/principal';

describe('cycles-top-up.utils', () => {
	const canister = 'ywcsb-maaaa-aaaai-q6k7a-cai';
	const otherCanister = 'um5iw-rqaaa-aaaaq-qaaba-cai';

	describe('getCanisterNetworkContacts', () => {
		const contact = ({ id, addresses }: Pick<ContactUi, 'id' | 'addresses'>): ContactUi => ({
			id,
			name: `Contact ${id}`,
			updateTimestampNs: 12n,
			addresses,
			image: undefined
		});

		const backend = contact({
			id: 1n,
			addresses: [
				{ addressType: 'Icrcv2', address: canister },
				{ addressType: 'Icrcv2', address: mockPrincipalText },
				{ addressType: 'Icrcv2', address: mockAccountIdentifierText },
				{
					addressType: 'Icrcv2',
					address: encodeIcrcAccount({
						owner: Principal.fromText(canister),
						subaccount: new Uint8Array(32).fill(1)
					})
				},
				mockContactEthAddressUi
			]
		});

		const ledger = contact({
			id: 2n,
			addresses: [{ addressType: 'Icrcv2', address: otherCanister }]
		});

		it('keeps one entry per contact address that is a canister ID, and nothing else', () => {
			expect(getCanisterNetworkContacts([backend, ledger])).toEqual({
				[getNetworkContactKey({ contact: backend, address: canister })]: {
					address: canister,
					contact: backend
				},
				[getNetworkContactKey({ contact: ledger, address: otherCanister })]: {
					address: otherCanister,
					contact: ledger
				}
			});
		});

		it('is empty without contacts', () => {
			expect(getCanisterNetworkContacts([])).toEqual({});
		});
	});

	describe('parseCanisterId', () => {
		it('should accept a canister ID', () => {
			expect(parseCanisterId(canister)?.toText()).toBe(canister);
		});

		it('should accept a canister ID with surrounding spaces', () => {
			expect(parseCanisterId(` ${canister} `)?.toText()).toBe(canister);
		});

		it.each([
			{ name: 'a user principal', text: mockPrincipalText },
			{ name: 'the anonymous principal', text: '2vxsx-fae' },
			{ name: 'the management canister', text: 'aaaaa-aa' },
			{ name: 'an ICRC account with a subaccount', text: `${canister}-dfxgiyy.1` },
			{ name: 'an ICP account identifier', text: mockAccountIdentifierText },
			{ name: 'an Ethereum address', text: '0x1234567890abcdef1234567890abcdef12345678' },
			{ name: 'a canister ID with a typo', text: 'ywcsb-maaaa-aaaai-q6k7b-cai' },
			{ name: 'empty text', text: '' }
		])('should refuse $name', ({ text }) => {
			expect(parseCanisterId(text)).toBeUndefined();
		});
	});

	describe('isCanisterId', () => {
		it('should recognise a canister ID', () => {
			expect(isCanisterId(Principal.fromText(canister))).toBeTruthy();
		});

		it('should not recognise a user principal or the anonymous principal', () => {
			expect(isCanisterId(mockPrincipal)).toBeFalsy();
			expect(isCanisterId(Principal.anonymous())).toBeFalsy();
		});
	});

	describe('isCanisterAccount', () => {
		it('should recognise a canister account, with or without a subaccount', () => {
			expect(isCanisterAccount(canister)).toBeTruthy();
			expect(
				isCanisterAccount(
					encodeIcrcAccount({
						owner: Principal.fromText(canister),
						subaccount: new Uint8Array(32).fill(1)
					})
				)
			).toBeTruthy();
		});

		it('should not recognise a user account, an ICP account identifier or other text', () => {
			expect(isCanisterAccount(mockPrincipalText)).toBeFalsy();
			expect(isCanisterAccount(mockAccountIdentifierText)).toBeFalsy();
			expect(isCanisterAccount('not an account')).toBeFalsy();
		});
	});

	describe('getRecentlyToppedUpCanisters', () => {
		const topUp = ({
			id,
			to,
			value,
			timestamp
		}: {
			id: string;
			to: string;
			value: bigint;
			timestamp?: bigint;
		}): IcTransactionUi => ({
			id,
			type: 'burn',
			typeLabel: 'transaction.label.top_up',
			to,
			value,
			timestamp,
			status: 'executed'
		});

		it('should list each canister once, with its newest top-up, newest first', () => {
			expect(
				getRecentlyToppedUpCanisters([
					topUp({ id: '1', to: canister, value: 1n, timestamp: 100n }),
					topUp({ id: '2', to: otherCanister, value: 2n, timestamp: 200n }),
					topUp({ id: '3', to: canister, value: 3n, timestamp: 300n })
				])
			).toEqual([
				{ canisterId: canister, value: 3n, timestamp: 300n },
				{ canisterId: otherCanister, value: 2n, timestamp: 200n }
			]);
		});

		it('should keep the dated top-up over one without a time', () => {
			expect(
				getRecentlyToppedUpCanisters([
					topUp({ id: '1', to: canister, value: 1n, timestamp: 100n }),
					topUp({ id: '2', to: canister, value: 2n })
				])
			).toEqual([{ canisterId: canister, value: 1n, timestamp: 100n }]);
		});

		it('should leave out everything that is not a top-up', () => {
			expect(
				getRecentlyToppedUpCanisters([
					{ ...topUp({ id: '1', to: canister, value: 1n }), typeLabel: undefined },
					{
						...topUp({ id: '2', to: canister, value: 1n }),
						typeLabel: 'transaction.label.top_up_refund'
					},
					{ ...topUp({ id: '3', to: canister, value: 1n }), to: undefined }
				])
			).toEqual([]);
		});
	});

	describe('isCyclesTopUpTokenUsable', () => {
		it.each([
			{ balance: 40_001n, usable: true },
			{ balance: 40_000n, usable: false },
			{ balance: ZERO, usable: false }
		])(
			'takes ICP above the CMC’s refund fees plus the fee: $balance e8s → $usable',
			({ balance, usable }) => {
				expect(isCyclesTopUpTokenUsable({ token: ICP_TOKEN, balance })).toBe(usable);
			}
		);

		it.each([
			{ balance: 200_000_001n, usable: true },
			{ balance: 200_000_000n, usable: false }
		])(
			'takes TCYCLES above twice the cycles ledger’s fee: $balance → $usable',
			({ balance, usable }) => {
				expect(isCyclesTopUpTokenUsable({ token: mockTcyclesToken, balance })).toBe(usable);
			}
		);

		it.each([null, undefined])('counts a balance that has not loaded (%s) as zero', (balance) => {
			expect(isCyclesTopUpTokenUsable({ token: ICP_TOKEN, balance })).toBeFalsy();
			expect(isCyclesTopUpTokenUsable({ token: mockTcyclesToken, balance })).toBeFalsy();
		});
	});

	describe('estimateCyclesTopUpCycles', () => {
		it('converts every e8 into the rate’s cycles, with no fee taken off', () => {
			expect(estimateCyclesTopUpCycles({ amount: 100_000_000n, xdrPermyriadPerIcp: 24_900n })).toBe(
				2_490_000_000_000n
			);
		});
	});

	describe('formatTrillionCycles', () => {
		it.each([
			{ cycles: 2_490_000_000_000n, expected: '2.49' },
			{ cycles: 996_000_000n, expected: '0.000996' },
			{ cycles: 1n, expected: '0.000000000001' }
		])('shows $cycles cycles as $expected trillions', ({ cycles, expected }) => {
			expect(formatTrillionCycles(cycles)).toBe(expected);
		});
	});
});
