import { getCanisterExistence } from '$icp/api/canister-state.api';
import { getAgent } from '$lib/actors/agents.ic';
import * as consoleUtils from '$lib/utils/console.utils';
import { mockIdentity } from '$tests/mocks/identity.mock';
import {
	CanisterStatus,
	Certificate,
	HttpErrorCode,
	LookupPathStatus,
	ProtocolError,
	type HttpAgent
} from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import { mock } from 'vitest-mock-extended';

vi.mock('$lib/actors/agents.ic', () => ({
	getAgent: vi.fn()
}));

describe('canister-state.api', () => {
	describe('getCanisterExistence', () => {
		const canisterId = Principal.fromText('ywcsb-maaaa-aaaai-q6k7a-cai');
		const rootKey = new Uint8Array([1, 2, 3]);
		const certificateBytes = new Uint8Array([4, 5, 6]);
		const controllersPath = CanisterStatus.encodePath('controllers', canisterId);

		const agent = mock<HttpAgent>();
		const certificate = mock<Certificate>();

		const notFound = (bodyText: string): ProtocolError =>
			ProtocolError.fromCode(new HttpErrorCode(400, 'Bad Request', [], bodyText));

		beforeEach(() => {
			vi.clearAllMocks();

			agent.rootKey = rootKey;
			agent.readState.mockResolvedValue({ certificate: certificateBytes });
			vi.mocked(getAgent).mockResolvedValue(agent);

			vi.spyOn(Certificate, 'create').mockResolvedValue(certificate);
			vi.spyOn(consoleUtils, 'consoleError').mockImplementation(() => {});
		});

		it('should read the controllers of the canister and verify the certificate against the root key', async () => {
			certificate.lookup_path.mockReturnValue({
				status: LookupPathStatus.Found,
				value: new Uint8Array()
			});

			await expect(getCanisterExistence({ identity: mockIdentity, canisterId })).resolves.toBe(
				'exists'
			);
			expect(getAgent).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
			expect(agent.readState).toHaveBeenCalledExactlyOnceWith(canisterId, {
				paths: [controllersPath]
			});
			expect(Certificate.create).toHaveBeenCalledExactlyOnceWith({
				certificate: certificateBytes,
				rootKey,
				canisterId,
				agent
			});
			expect(certificate.lookup_path).toHaveBeenCalledExactlyOnceWith(controllersPath);
		});

		it('should report a canister the certificate proves absent as not found', async () => {
			certificate.lookup_path.mockReturnValue({ status: LookupPathStatus.Absent });

			await expect(getCanisterExistence({ identity: mockIdentity, canisterId })).resolves.toBe(
				'not_found'
			);
		});

		it.each([LookupPathStatus.Unknown, LookupPathStatus.Error] as const)(
			'should report the lookup status %s as unknown',
			async (status) => {
				certificate.lookup_path.mockReturnValue({ status });

				await expect(getCanisterExistence({ identity: mockIdentity, canisterId })).resolves.toBe(
					'unknown'
				);
			}
		);

		it('should report the boundary node not finding the canister as not found', async () => {
			agent.readState.mockRejectedValue(
				notFound('error: canister_not_found\ndetails: The specified canister does not exist.')
			);

			await expect(getCanisterExistence({ identity: mockIdentity, canisterId })).resolves.toBe(
				'not_found'
			);
			expect(Certificate.create).not.toHaveBeenCalled();
		});

		it('should report another bad request as unknown', async () => {
			agent.readState.mockRejectedValue(notFound('error: invalid_request'));

			await expect(getCanisterExistence({ identity: mockIdentity, canisterId })).resolves.toBe(
				'unknown'
			);
		});

		it('should report unknown when the agent cannot be created', async () => {
			const err = new Error('Root key unavailable');
			vi.mocked(getAgent).mockRejectedValue(err);

			await expect(getCanisterExistence({ identity: mockIdentity, canisterId })).resolves.toBe(
				'unknown'
			);
			expect(consoleUtils.consoleError).toHaveBeenCalledExactlyOnceWith(err);
			expect(agent.readState).not.toHaveBeenCalled();
		});

		it('should report a failed read as unknown', async () => {
			const err = new Error('Network down');
			agent.readState.mockRejectedValue(err);

			await expect(getCanisterExistence({ identity: mockIdentity, canisterId })).resolves.toBe(
				'unknown'
			);
			expect(consoleUtils.consoleError).toHaveBeenCalledExactlyOnceWith(err);
		});

		it('should report a certificate that does not verify as unknown', async () => {
			const err = new Error('Invalid signature');
			vi.mocked(Certificate.create).mockRejectedValue(err);

			await expect(getCanisterExistence({ identity: mockIdentity, canisterId })).resolves.toBe(
				'unknown'
			);
			expect(consoleUtils.consoleError).toHaveBeenCalledExactlyOnceWith(err);
		});

		it('should report unknown without a root key to verify against', async () => {
			agent.rootKey = null;

			await expect(getCanisterExistence({ identity: mockIdentity, canisterId })).resolves.toBe(
				'unknown'
			);
			expect(Certificate.create).not.toHaveBeenCalled();
		});
	});
});
