import { XRP_KEY_ID } from '$env/networks/networks.xrp.env';
import * as signerApi from '$lib/api/signer.api';
import { xrpAddressMainnetStore } from '$lib/stores/address.store';
import { authStore } from '$lib/stores/auth.store';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { XRP_DERIVATION_PATH_PREFIX } from '$xrp/constants/xrp.constants';
import { getXrpAddressMainnet, loadXrpAddressMainnet } from '$xrp/services/xrp-address.services';
import { XrpNetworks } from '$xrp/types/network';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

describe('xrp-address.services', () => {
	// Raw 32-byte Ed25519 key (canonical key ED01FA53…37A63 without its 0xED prefix) whose
	// derived classic address is the authoritative rLUEXYuLiQptky37CqLcm9USQpPiz5rkpD vector.
	const mockPublicKey = Uint8Array.from(
		Buffer.from('01FA53FA5A7E77798F882ECE20B1ABC00BB358A9E55A202D0D0676BD0CE37A63', 'hex')
	);
	const expectedAddress = 'rLUEXYuLiQptky37CqLcm9USQpPiz5rkpD';

	let spyGetSchnorrPublicKey: MockInstance;

	beforeEach(() => {
		vi.clearAllMocks();
		xrpAddressMainnetStore.reset();

		authStore.setForTesting(mockIdentity);

		spyGetSchnorrPublicKey = vi.spyOn(signerApi, 'getSchnorrPublicKey');
		spyGetSchnorrPublicKey.mockResolvedValue(mockPublicKey);
	});

	it('derives the mainnet XRP address from the signer public key', async () => {
		const result = await getXrpAddressMainnet(mockIdentity);

		expect(result).toBe(expectedAddress);
	});

	it('requests the signer key with the XRP key id and derivation path', async () => {
		await getXrpAddressMainnet(mockIdentity);

		expect(spyGetSchnorrPublicKey).toHaveBeenCalledWith({
			identity: mockIdentity,
			keyId: XRP_KEY_ID,
			derivationPath: [XRP_DERIVATION_PATH_PREFIX, XrpNetworks.mainnet]
		});
	});

	it('loads the mainnet address into the store', async () => {
		const result = await loadXrpAddressMainnet();

		expect(result).toEqual({ success: true });
		expect(get(xrpAddressMainnetStore)).toEqual({
			data: expectedAddress,
			certified: true
		});
	});
});
