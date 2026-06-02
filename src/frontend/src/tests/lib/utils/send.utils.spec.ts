import { goto } from '$app/navigation';
import {
	BTC_MAINNET_NETWORK_ID,
	BTC_REGTEST_NETWORK_ID,
	BTC_TESTNET_NETWORK_ID
} from '$env/networks/networks.btc.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { AppPath } from '$lib/constants/routes.constants';
import { ProgressStepsSend } from '$lib/enums/progress-steps';
import { dirtyWizardState } from '$lib/stores/progressWizardState.store';
import type { Nft } from '$lib/types/nft';
import {
	isInvalidDestinationBtc,
	redirectAfterCompletedNftSend,
	shouldSkipDestinationStep
} from '$lib/utils/send.utils';
import { parseNftId } from '$lib/validation/nft.validation';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockPrincipalText } from '$tests/mocks/identity.mock';
import { mockValidErc721Nft } from '$tests/mocks/nfts.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { get } from 'svelte/store';

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

describe('send.utils', () => {
	describe('redirectAfterCompletedNftSend', () => {
		const selectedNft = mockValidErc721Nft;
		const siblingNft: Nft = { ...mockValidErc721Nft, id: parseNftId('173564') };

		const defaultParams = {
			isNftsPage: true,
			routeNft: selectedNft.id,
			sendProgressStep: ProgressStepsSend.DONE,
			selectedNft,
			collectionNfts: [selectedNft, siblingNft]
		};

		beforeEach(() => {
			vi.clearAllMocks();
			dirtyWizardState.set(true);
		});

		it('redirects to the collection page and clears dirty state when another NFT remains', () => {
			redirectAfterCompletedNftSend(defaultParams);

			expect(goto).toHaveBeenCalledExactlyOnceWith(
				`${AppPath.Nfts}?collection=${selectedNft.collection.address}&network=${selectedNft.collection.network.id.description}`
			);
			expect(get(dirtyWizardState)).toBeFalsy();
		});

		it('redirects to the NFTs root page and clears dirty state when the sent NFT was last', () => {
			redirectAfterCompletedNftSend({
				...defaultParams,
				collectionNfts: [selectedNft]
			});

			expect(goto).toHaveBeenCalledExactlyOnceWith(AppPath.Nfts);
			expect(get(dirtyWizardState)).toBeFalsy();
		});

		it.each([
			{ description: 'the modal is not opened from an NFTs page', isNftsPage: false },
			{ description: 'there is no routed NFT detail id', routeNft: undefined },
			{
				description: 'the send is still in progress',
				sendProgressStep: ProgressStepsSend.TRANSFER
			},
			{ description: 'there is no selected NFT', selectedNft: undefined }
		])('does not redirect or clear dirty state when $description', (overrides) => {
			redirectAfterCompletedNftSend({
				...defaultParams,
				...overrides
			});

			expect(goto).not.toHaveBeenCalled();
			expect(get(dirtyWizardState)).toBeTruthy();
		});
	});

	describe('isInvalidDestinationBtc', () => {
		it('should return true if network and destination match', () => {
			expect(
				isInvalidDestinationBtc({ destination: mockBtcAddress, networkId: BTC_TESTNET_NETWORK_ID })
			).toBeTruthy();
		});

		it('should return false if network and destination do not match', () => {
			expect(
				isInvalidDestinationBtc({ destination: mockBtcAddress, networkId: BTC_MAINNET_NETWORK_ID })
			).toBeFalsy();
		});

		it('should return false if destination is empty', () => {
			expect(
				isInvalidDestinationBtc({ destination: '', networkId: BTC_MAINNET_NETWORK_ID })
			).toBeFalsy();
		});

		it('should use Regtest network when networkId is BTC_REGTEST_NETWORK_ID', () => {
			expect(
				isInvalidDestinationBtc({ destination: mockBtcAddress, networkId: BTC_REGTEST_NETWORK_ID })
			).toBeTruthy();
		});

		it('should use Mainnet when networkId is undefined', () => {
			expect(
				isInvalidDestinationBtc({ destination: mockBtcAddress, networkId: undefined })
			).toBeFalsy();
		});
	});

	describe('shouldSkipDestinationStep', () => {
		it('returns true when destination is a valid Sol address and the token is on Solana', () => {
			expect(
				shouldSkipDestinationStep({ destination: mockSolAddress, token: SOLANA_TOKEN })
			).toBeTruthy();
		});

		it('returns true when destination is a valid BTC mainnet address and the token is on BTC', () => {
			expect(
				shouldSkipDestinationStep({ destination: mockBtcAddress, token: BTC_MAINNET_TOKEN })
			).toBeTruthy();
		});

		it('returns true when destination is a valid principal and the token is on IC', () => {
			expect(
				shouldSkipDestinationStep({ destination: mockPrincipalText, token: ICP_TOKEN })
			).toBeTruthy();
		});

		it('returns false when destination is empty', () => {
			expect(shouldSkipDestinationStep({ destination: '', token: SOLANA_TOKEN })).toBeFalsy();
			expect(shouldSkipDestinationStep({ destination: '', token: BTC_MAINNET_TOKEN })).toBeFalsy();
			expect(shouldSkipDestinationStep({ destination: '', token: ICP_TOKEN })).toBeFalsy();
		});

		it('returns false when the chosen token is not on a Solana network', () => {
			expect(
				shouldSkipDestinationStep({ destination: mockSolAddress, token: BTC_MAINNET_TOKEN })
			).toBeFalsy();

			expect(
				shouldSkipDestinationStep({ destination: mockSolAddress, token: ETHEREUM_TOKEN })
			).toBeFalsy();
		});

		it('returns false when destination is not a valid Sol address', () => {
			expect(
				shouldSkipDestinationStep({ destination: mockEthAddress, token: SOLANA_TOKEN })
			).toBeFalsy();

			expect(
				shouldSkipDestinationStep({ destination: 'not-an-address', token: SOLANA_TOKEN })
			).toBeFalsy();
		});

		it('returns false when destination is not a valid BTC address for a BTC token', () => {
			expect(
				shouldSkipDestinationStep({ destination: mockEthAddress, token: BTC_MAINNET_TOKEN })
			).toBeFalsy();

			expect(
				shouldSkipDestinationStep({ destination: mockPrincipalText, token: BTC_MAINNET_TOKEN })
			).toBeFalsy();
		});

		it('returns false when destination is not a valid principal for an IC token', () => {
			expect(
				shouldSkipDestinationStep({ destination: mockBtcAddress, token: ICP_TOKEN })
			).toBeFalsy();

			expect(
				shouldSkipDestinationStep({ destination: 'not-a-principal', token: ICP_TOKEN })
			).toBeFalsy();
		});

		it('returns false when the chosen token is on Ethereum (unsupported by skip)', () => {
			expect(
				shouldSkipDestinationStep({ destination: mockEthAddress, token: ETHEREUM_TOKEN })
			).toBeFalsy();
		});
	});
});
