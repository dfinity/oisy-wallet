import type { Value } from '$declarations/icrc3/icrc3.did';
import type { Icrc3Block } from '$icp/services/icrc3.services';
import { getIcrcAccount } from '$icp/utils/icrc-account.utils';
import { mapIcrc7BlockToTransactions } from '$icp/utils/icrc7-transactions.utils';
import { mockIdentity, mockPrincipal, mockPrincipal2 } from '$tests/mocks/identity.mock';
import { encodeIcrcAccount } from '@icp-sdk/canisters/ledger/icrc';
import type { Principal } from '@icp-sdk/core/principal';

describe('icrc7-transactions.utils', () => {
	const timestamp = 1_700_000_000_000_000_000n;
	const tokenId = 50n;
	const selfAccount = encodeIcrcAccount(getIcrcAccount(mockPrincipal));
	const otherAccount = encodeIcrcAccount(getIcrcAccount(mockPrincipal2));

	const accountValue = (principal: Principal): Value => ({
		Map: [['owner', { Text: principal.toText() }]]
	});

	const block = ({
		id = 42n,
		btype,
		tx
	}: {
		id?: bigint;
		btype: '7mint' | '7burn' | '7xfer' | '1xfer';
		tx: Array<[string, Value]>;
	}): Icrc3Block => ({
		id,
		block: {
			Map: [
				['btype', { Text: btype }],
				['ts', { Nat: timestamp }],
				['tx', { Map: [['tid', { Nat: tokenId }], ...tx] }]
			]
		}
	});

	it('should map incoming mint blocks for the signed-in account', () => {
		expect(
			mapIcrc7BlockToTransactions({
				block: block({ btype: '7mint', tx: [['to', accountValue(mockPrincipal)]] }),
				identity: mockIdentity
			})
		).toEqual([
			{
				id: '42',
				type: 'mint',
				to: selfAccount,
				incoming: true,
				timestamp,
				status: 'executed',
				tokenId
			}
		]);
	});

	it('should map outgoing burn blocks for the signed-in account', () => {
		expect(
			mapIcrc7BlockToTransactions({
				block: block({ btype: '7burn', tx: [['from', accountValue(mockPrincipal)]] }),
				identity: mockIdentity
			})
		).toEqual([
			{
				id: '42',
				type: 'burn',
				from: selfAccount,
				incoming: false,
				timestamp,
				status: 'executed',
				tokenId
			}
		]);
	});

	it('should map send and receive transfer blocks by direction', () => {
		expect(
			mapIcrc7BlockToTransactions({
				block: block({
					btype: '7xfer',
					tx: [
						['from', accountValue(mockPrincipal)],
						['to', accountValue(mockPrincipal2)]
					]
				}),
				identity: mockIdentity
			})
		).toEqual([
			{
				id: '42',
				type: 'send',
				from: selfAccount,
				to: otherAccount,
				incoming: false,
				timestamp,
				status: 'executed',
				tokenId
			}
		]);

		expect(
			mapIcrc7BlockToTransactions({
				block: block({
					id: 43n,
					btype: '7xfer',
					tx: [
						['from', accountValue(mockPrincipal2)],
						['to', accountValue(mockPrincipal)]
					]
				}),
				identity: mockIdentity
			})
		).toEqual([
			{
				id: '43',
				type: 'receive',
				from: otherAccount,
				to: selfAccount,
				incoming: true,
				timestamp,
				status: 'executed',
				tokenId
			}
		]);
	});

	it('should duplicate self-transfers as send and receive rows', () => {
		expect(
			mapIcrc7BlockToTransactions({
				block: block({
					btype: '7xfer',
					tx: [
						['from', accountValue(mockPrincipal)],
						['to', accountValue(mockPrincipal)]
					]
				}),
				identity: mockIdentity
			})
		).toEqual([
			{
				id: '42',
				type: 'send',
				from: selfAccount,
				to: selfAccount,
				incoming: false,
				timestamp,
				status: 'executed',
				tokenId
			},
			{
				id: '42-self',
				type: 'receive',
				from: selfAccount,
				to: selfAccount,
				incoming: true,
				timestamp,
				status: 'executed',
				tokenId
			}
		]);
	});

	it('should ignore unsupported, malformed, or unrelated blocks', () => {
		expect(
			mapIcrc7BlockToTransactions({
				block: block({ btype: '1xfer', tx: [['to', accountValue(mockPrincipal)]] }),
				identity: mockIdentity
			})
		).toEqual([]);

		expect(
			mapIcrc7BlockToTransactions({
				block: { id: 1n, block: { Map: [['btype', { Text: '7mint' }]] } },
				identity: mockIdentity
			})
		).toEqual([]);

		expect(
			mapIcrc7BlockToTransactions({
				block: block({ btype: '7mint', tx: [['to', accountValue(mockPrincipal2)]] }),
				identity: mockIdentity
			})
		).toEqual([]);
	});
});
