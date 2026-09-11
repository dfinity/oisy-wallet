import {
	NEAR_INTENTS_EXPLORER_URL,
	ONESEC_EXPLORER_URL,
	VELORA_EXPLORER_URL
} from '$env/explorers.env';
import { SwapProvider } from '$lib/types/swap';
import {
	buildHelpExplorerGroups,
	HELP_EXPLORER_PROVIDER_NAMES
} from '$lib/utils/help-explorers.utils';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockPrincipalText } from '$tests/mocks/identity.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';

describe('help-explorers.utils', () => {
	const allAddresses = {
		ethAddress: mockEthAddress,
		solAddress: mockSolAddress,
		btcAddress: mockBtcAddress,
		principal: mockPrincipalText
	};

	describe('buildHelpExplorerGroups', () => {
		it('builds one group per provider, in a stable order', () => {
			const groups = buildHelpExplorerGroups(allAddresses);

			expect(groups.map(({ provider }) => provider)).toEqual([
				SwapProvider.VELORA,
				SwapProvider.NEAR_INTENTS,
				SwapProvider.ONE_SEC
			]);
		});

		it('links Velora to the user own order list', () => {
			const [velora] = buildHelpExplorerGroups(allAddresses);

			expect(velora.links).toEqual([
				{
					chain: 'eth',
					url: `${VELORA_EXPLORER_URL}/explorer/user/${mockEthAddress}/all-orders`
				}
			]);
		});

		it('gives NEAR Intents one link per settleable chain', () => {
			const [, nearIntents] = buildHelpExplorerGroups(allAddresses);

			expect(nearIntents.links).toEqual([
				{ chain: 'eth', url: `${NEAR_INTENTS_EXPLORER_URL}/?search=${mockEthAddress}` },
				{ chain: 'sol', url: `${NEAR_INTENTS_EXPLORER_URL}/?search=${mockSolAddress}` },
				{ chain: 'btc', url: `${NEAR_INTENTS_EXPLORER_URL}/?search=${mockBtcAddress}` }
			]);
		});

		it('gives 1Sec both ends of the bridge, ICP first', () => {
			const [, , oneSec] = buildHelpExplorerGroups(allAddresses);

			expect(oneSec.links).toEqual([
				{ chain: 'icp', url: `${ONESEC_EXPLORER_URL}/explorer/?address=${mockPrincipalText}` },
				{ chain: 'eth', url: `${ONESEC_EXPLORER_URL}/explorer/?address=${mockEthAddress}` }
			]);
		});

		it('drops a link whose address has not loaded yet', () => {
			const groups = buildHelpExplorerGroups({ ...allAddresses, solAddress: undefined });

			const [, nearIntents] = groups;

			expect(nearIntents.links.map(({ chain }) => chain)).toEqual(['eth', 'btc']);
		});

		it('treats a null address the same as a missing one', () => {
			const groups = buildHelpExplorerGroups({ ...allAddresses, btcAddress: null });

			const [, nearIntents] = groups;

			expect(nearIntents.links.map(({ chain }) => chain)).toEqual(['eth', 'sol']);
		});

		it('treats an empty address the same as a missing one', () => {
			const groups = buildHelpExplorerGroups({ ...allAddresses, principal: '' });

			const [, , oneSec] = groups;

			expect(oneSec.links.map(({ chain }) => chain)).toEqual(['eth']);
		});

		it('omits a provider whose every link is unavailable', () => {
			const groups = buildHelpExplorerGroups({
				solAddress: mockSolAddress,
				principal: mockPrincipalText
			});

			// Velora is EVM-only, so without an Ethereum address it has nothing to offer.
			expect(groups.map(({ provider }) => provider)).toEqual([
				SwapProvider.NEAR_INTENTS,
				SwapProvider.ONE_SEC
			]);
		});

		it('returns nothing when no address has loaded', () => {
			expect(buildHelpExplorerGroups({})).toEqual([]);
		});
	});

	describe('HELP_EXPLORER_PROVIDER_NAMES', () => {
		it('names every provider the builder can return', () => {
			const providers = buildHelpExplorerGroups(allAddresses).map(({ provider }) => provider);

			expect(providers.map((provider) => HELP_EXPLORER_PROVIDER_NAMES[provider])).toEqual([
				'Velora',
				'NEAR Intents',
				'1Sec'
			]);
		});
	});
});
