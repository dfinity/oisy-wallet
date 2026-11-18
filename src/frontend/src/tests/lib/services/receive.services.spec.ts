import * as btcAddressServices from '$btc/services/btc-address.services';
import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import {
	IC_CKBTC_LEDGER_CANISTER_ID,
	IC_CKBTC_MINTER_CANISTER_ID
} from '$env/tokens/tokens-icrc/tokens.icrc.ck.btc.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import * as ethAddressServices from '$eth/services/eth-address.services';
import * as ckBtcServices from '$icp/services/ckbtc.services';
import type { IcCkToken } from '$icp/types/ic-token';
import { retryReceiveAddress } from '$lib/services/receive.services';
import type { Token } from '$lib/types/token';
import { getReceiveRoutes } from '$lib/utils/receive.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import * as solAddressServices from '$sol/services/sol-address.services';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';

describe('receive.services', () => {
	describe('retryReceiveAddress', () => {
		const ckBtcToken: IcCkToken = {
			...mockValidIcToken,
			id: parseTokenId('ckBTC'),
			symbol: 'ckBTC',
			network: ICP_NETWORK,
			standard: { code: 'icrc' },
			ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
			minterCanisterId: IC_CKBTC_MINTER_CANISTER_ID,
			twinToken: BTC_MAINNET_TOKEN
		};

		const routeOf = ({ token, index = 0 }: { token: Token; index?: number }) =>
			getReceiveRoutes({
				tokens: [token],
				enabledNetworkIds: [
					ICP_NETWORK.id,
					BTC_MAINNET_NETWORK_ID,
					ETHEREUM_TOKEN.network.id,
					SOLANA_TOKEN.network.id
				]
			})[index];

		beforeEach(() => {
			vi.restoreAllMocks();

			vi.spyOn(btcAddressServices, 'loadBtcAddressMainnet').mockResolvedValue({ success: true });
			vi.spyOn(ethAddressServices, 'loadEthAddress').mockResolvedValue({ success: true });
			vi.spyOn(solAddressServices, 'loadSolAddressMainnet').mockResolvedValue({ success: true });
			vi.spyOn(ckBtcServices, 'loadCkBtcDepositAddress').mockResolvedValue();
		});

		it('should reload the Bitcoin wallet address of a BTC route', async () => {
			await retryReceiveAddress({
				route: routeOf({ token: BTC_MAINNET_TOKEN }),
				identity: mockIdentity
			});

			expect(btcAddressServices.loadBtcAddressMainnet).toHaveBeenCalledOnce();
			expect(ckBtcServices.loadCkBtcDepositAddress).not.toHaveBeenCalled();
		});

		it('should reload the minter deposit address of the ckBTC deposit route', async () => {
			await retryReceiveAddress({
				route: routeOf({ token: ckBtcToken, index: 1 }),
				identity: mockIdentity
			});

			expect(ckBtcServices.loadCkBtcDepositAddress).toHaveBeenCalledExactlyOnceWith({
				...ckBtcToken,
				identity: mockIdentity
			});
			expect(btcAddressServices.loadBtcAddressMainnet).not.toHaveBeenCalled();
		});

		it('should reload the shared EVM address and the Solana address', async () => {
			await retryReceiveAddress({
				route: routeOf({ token: ETHEREUM_TOKEN }),
				identity: mockIdentity
			});
			await retryReceiveAddress({
				route: routeOf({ token: SOLANA_TOKEN }),
				identity: mockIdentity
			});

			expect(ethAddressServices.loadEthAddress).toHaveBeenCalledOnce();
			expect(solAddressServices.loadSolAddressMainnet).toHaveBeenCalledOnce();
		});

		it('should load nothing for the ICP formats, which come from the identity', async () => {
			await retryReceiveAddress({ route: routeOf({ token: ICP_TOKEN }), identity: mockIdentity });
			await retryReceiveAddress({ route: routeOf({ token: ckBtcToken }), identity: mockIdentity });

			expect(ckBtcServices.loadCkBtcDepositAddress).not.toHaveBeenCalled();
			expect(ethAddressServices.loadEthAddress).not.toHaveBeenCalled();
		});
	});
});
