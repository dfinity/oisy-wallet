import * as canisterStateApi from '$icp/api/canister-state.api';
import * as icrcLedgerApi from '$icp/api/icrc-ledger.api';
import { checkIcrcLedgerStatus } from '$icp/services/icrc-ledger-status.services';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { IcrcTokenMetadataResponse } from '@icp-sdk/canisters/ledger/icrc';
import {
	CertifiedRejectErrorCode,
	HttpErrorCode,
	ProtocolError,
	RejectError,
	ReplicaRejectCode,
	UncertifiedRejectUpdateErrorCode,
	requestIdOf
} from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import type { MockInstance } from 'vitest';

describe('icrc-ledger-status.services', () => {
	describe('checkIcrcLedgerStatus', () => {
		const ledgerCanisterId = 'aiw2p-tyaaa-aaaam-aebyq-cai';

		const requestId = requestIdOf({ method_name: 'icrc1_metadata' });

		// What the agent throws for a certified call the replica rejected, as a mainnet ledger without
		// ICRC methods (IC0536) or without code (IC0537) answers.
		const callReject = ({
			rejectCode = ReplicaRejectCode.CanisterError,
			rejectErrorCode
		}: {
			rejectCode?: ReplicaRejectCode;
			rejectErrorCode?: string;
		}) =>
			RejectError.fromCode(
				new CertifiedRejectErrorCode(requestId, rejectCode, 'test', rejectErrorCode)
			);

		// The metadata a token needs to load: name, symbol, decimals and fee.
		const tokenMetadata: IcrcTokenMetadataResponse = [
			['icrc1:name', { Text: 'Test' }],
			['icrc1:symbol', { Text: 'TST' }],
			['icrc1:decimals', { Nat: 8n }],
			['icrc1:fee', { Nat: 10_000n }]
		];

		const check = () => checkIcrcLedgerStatus({ identity: mockIdentity, ledgerCanisterId });

		let metadataSpy: MockInstance<typeof icrcLedgerApi.metadata>;
		let existenceSpy: MockInstance<typeof canisterStateApi.getCanisterExistence>;

		beforeEach(() => {
			vi.clearAllMocks();

			metadataSpy = vi.spyOn(icrcLedgerApi, 'metadata');
			existenceSpy = vi.spyOn(canisterStateApi, 'getCanisterExistence').mockResolvedValue('exists');
		});

		it('should ask the ledger for its metadata with a certified call', async () => {
			metadataSpy.mockResolvedValue([]);

			await check();

			expect(metadataSpy).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				ledgerCanisterId,
				certified: true
			});
		});

		it('should report a ledger that answers', async () => {
			metadataSpy.mockResolvedValue(tokenMetadata);

			await expect(check()).resolves.toEqual({ status: 'responding' });
		});

		it.each<{ description: string; response: IcrcTokenMetadataResponse }>([
			{ description: 'no metadata', response: [] },
			{ description: 'a name only', response: [['icrc1:name', { Text: 'Test' }]] }
		])(
			'should report a ledger that answers with $description as an error',
			async ({ response }) => {
				metadataSpy.mockResolvedValue(response);

				await expect(check()).resolves.toEqual({ status: 'error' });
			}
		);

		it.each(['IC0301', 'IC0537'])(
			'should report no ledger when the replica rejects with %s',
			async (rejectErrorCode) => {
				metadataSpy.mockRejectedValue(callReject({ rejectErrorCode }));

				await expect(check()).resolves.toEqual({ status: 'no_ledger' });

				expect(existenceSpy).not.toHaveBeenCalled();
			}
		);

		it.each(['IC0207', 'IC0508', 'IC0509'])(
			'should report a ledger that does not respond when the replica rejects with %s',
			async (rejectErrorCode) => {
				metadataSpy.mockRejectedValue(callReject({ rejectErrorCode }));

				await expect(check()).resolves.toEqual({ status: 'not_responding' });
			}
		);

		it('should report a ledger that does not respond on a transient reject', async () => {
			metadataSpy.mockRejectedValue(
				callReject({ rejectCode: ReplicaRejectCode.SysTransient, rejectErrorCode: 'IC0201' })
			);

			await expect(check()).resolves.toEqual({ status: 'not_responding' });
		});

		it('should report an error with the code the replica names', async () => {
			metadataSpy.mockRejectedValue(callReject({ rejectErrorCode: 'IC0536' }));

			await expect(check()).resolves.toEqual({ status: 'error', errorCode: 'IC0536' });
		});

		it('should report an error without a code when the replica names none', async () => {
			metadataSpy.mockRejectedValue(callReject({}));

			await expect(check()).resolves.toEqual({ status: 'error' });
		});

		it('should read the reject an update call gets before it runs too', async () => {
			metadataSpy.mockRejectedValueOnce(
				RejectError.fromCode(
					new UncertifiedRejectUpdateErrorCode(
						requestId,
						ReplicaRejectCode.CanisterError,
						'test',
						'IC0508'
					)
				)
			);

			await expect(check()).resolves.toEqual({ status: 'not_responding' });
		});

		it('should report no ledger when no replica answers and the canister does not exist', async () => {
			// The boundary node turns away a call to a canister that no subnet hosts.
			metadataSpy.mockRejectedValue(
				ProtocolError.fromCode(new HttpErrorCode(400, 'Bad Request', []))
			);
			existenceSpy.mockResolvedValue('not_found');

			await expect(check()).resolves.toEqual({ status: 'no_ledger' });

			expect(existenceSpy).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				canisterId: Principal.fromText(ledgerCanisterId)
			});
		});

		it.each(['exists', 'unknown'] as const)(
			'should report a ledger that does not respond when no replica answers and the canister existence is %s',
			async (existence) => {
				metadataSpy.mockRejectedValue(
					ProtocolError.fromCode(new HttpErrorCode(503, 'Service Unavailable', []))
				);
				existenceSpy.mockResolvedValue(existence);

				await expect(check()).resolves.toEqual({ status: 'not_responding' });
			}
		);
	});
});
