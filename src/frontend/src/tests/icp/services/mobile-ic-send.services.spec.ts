import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { CKBTC_LEDGER_CANISTER_IDS } from '$env/tokens/tokens-icrc/tokens.icrc.ck.btc.env';
import { CKERC20_LEDGER_CANISTER_IDS } from '$env/tokens/tokens-icrc/tokens.icrc.ck.erc20.env';
import { CKETH_LEDGER_CANISTER_IDS } from '$env/tokens/tokens-icrc/tokens.icrc.ck.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { icrc1Transfer, transfer as transferIcp } from '$icp/api/icp-ledger.api';
import { transfer as transferIcrc } from '$icp/api/icrc-ledger.api';
import { sendIc } from '$icp/services/ic-send.services';
import { MobileSendSessionExpiredError } from '$icp/types/ic-send';
import type { IcToken } from '$icp/types/ic-token';
import * as mobile from '$lib/constants/mobile.constants';
import { AuthClientProvider } from '$lib/providers/auth-client.providers';
import { waitAndTriggerWallet } from '$lib/utils/wallet.utils';
import { mockAccountIdentifierText, mockPrincipalText2 } from '$tests/mocks/identity.mock';
import { encodeIcrcAccount } from '@icp-sdk/canisters/ledger/icrc';
import { DelegationChain, DelegationIdentity, Ed25519KeyIdentity } from '@icp-sdk/core/identity';

vi.mock('$icp/api/icp-ledger.api', () => ({ transfer: vi.fn(), icrc1Transfer: vi.fn() }));
vi.mock('$icp/api/icrc-ledger.api', () => ({ transfer: vi.fn() }));
vi.mock('$icp/services/ck.services', () => ({
	convertCkBTCToBtc: vi.fn(),
	convertCkETHToEth: vi.fn(),
	convertCkErc20ToErc20: vi.fn()
}));
vi.mock('$lib/utils/wallet.utils', () => ({ waitAndTriggerWallet: vi.fn() }));

describe('mobile ICP Send', () => {
	let identity: DelegationIdentity;
	const completed = vi.fn();
	const provider = AuthClientProvider.getInstance();
	const root = Ed25519KeyIdentity.generate();
	const child = Ed25519KeyIdentity.generate();
	const send = ({
		token = ICP_TOKEN,
		to = mockPrincipalText2
	}: { token?: IcToken; to?: string } = {}) =>
		sendIc({
			token,
			to,
			amount: 25_000n,
			identity,
			sendCompleted: completed
		});

	beforeEach(async () => {
		vi.clearAllMocks();
		vi.spyOn(mobile, 'MOBILE_SHELL', 'get').mockReturnValue(true);
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date('2026-10-28T13:00:00Z'));
		const chain = await DelegationChain.create(
			root,
			child.getPublicKey(),
			new Date(Date.now() + 60_000)
		);
		identity = DelegationIdentity.fromDelegation(child, chain);
		provider.setMobileIdentity(identity);
	});

	afterEach(() => {
		provider.reset();
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('uses the existing ICP ICRC transfer and refreshes only after confirmation', async () => {
		await send();

		expect(icrc1Transfer).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				identity,
				amount: 25_000n,
				ledgerCanisterId: ICP_TOKEN.ledgerCanisterId
			})
		);
		expect(completed).toHaveBeenCalledOnce();
		expect(waitAndTriggerWallet).toHaveBeenCalledOnce();
		expect(transferIcrc).not.toHaveBeenCalled();
	});

	it('preserves ICP legacy account-ID support', async () => {
		await send({ to: mockAccountIdentifierText });

		expect(transferIcp).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({ to: mockAccountIdentifierText, amount: 25_000n })
		);
	});

	it.each([
		...CKBTC_LEDGER_CANISTER_IDS,
		...CKETH_LEDGER_CANISTER_IDS,
		...CKERC20_LEDGER_CANISTER_IDS
	])('sends a canonical ck ledger %s through ICRC', async (ledgerCanisterId) => {
		await send({ token: { ...ICP_TOKEN, standard: { code: 'icrc' }, ledgerCanisterId } });

		expect(transferIcrc).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({ ledgerCanisterId, identity, amount: 25_000n })
		);
		expect(icrc1Transfer).not.toHaveBeenCalled();
	});

	it.each(['expired', 'cleared', 'replaced'])(
		'rejects a %s session before any ledger call',
		async (state) => {
			if (state === 'expired') {
				vi.setSystemTime(Date.now() + 60_001);
			}
			if (state === 'cleared') {
				provider.setMobileIdentity(undefined);
			}
			if (state === 'replaced') {
				provider.setMobileIdentity(
					DelegationIdentity.fromDelegation(child, identity.getDelegation())
				);
			}

			await expect(send()).rejects.toBeInstanceOf(MobileSendSessionExpiredError);
			expect(icrc1Transfer).not.toHaveBeenCalled();
			expect(transferIcp).not.toHaveBeenCalled();
			expect(transferIcrc).not.toHaveBeenCalled();
			expect(completed).not.toHaveBeenCalled();
		}
	);

	it.each([
		{ ...ICP_TOKEN, ledgerCanisterId: 'aaaaa-aa' },
		{ ...ICP_TOKEN, standard: { code: 'dip20' as const } },
		{ ...ICP_TOKEN, standard: { code: 'icrc' as const }, ledgerCanisterId: 'aaaaa-aa' }
	])('rejects unsupported tokens even when Send is invoked directly', async (token) => {
		await expect(send({ token })).rejects.toThrow();
		expect(icrc1Transfer).not.toHaveBeenCalled();
		expect(transferIcrc).not.toHaveBeenCalled();
	});

	it('rejects cross-chain conversion before dispatch', async () => {
		await expect(
			sendIc({
				token: ICP_TOKEN,
				to: mockPrincipalText2,
				amount: 1n,
				identity,
				targetNetworkId: ETHEREUM_NETWORK_ID,
				sendCompleted: completed
			})
		).rejects.toThrow();
		expect(icrc1Transfer).not.toHaveBeenCalled();
	});

	it('rejects a minting/burning recipient', async () => {
		await expect(send({ to: encodeIcrcAccount(ICP_TOKEN.mintingAccount) })).rejects.toThrow();
		expect(icrc1Transfer).not.toHaveBeenCalled();
	});

	it('does not report success, refresh, or retry a rejected ledger request', async () => {
		vi.mocked(icrc1Transfer).mockRejectedValueOnce(new Error('Response lost'));

		await expect(send()).rejects.toThrow('Response lost');
		expect(icrc1Transfer).toHaveBeenCalledOnce();
		expect(completed).not.toHaveBeenCalled();
		expect(waitAndTriggerWallet).not.toHaveBeenCalled();
	});
});
