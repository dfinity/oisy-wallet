import { SolanaNetworks } from '$sol/types/network';
import { mockSolSignature } from '$tests/mocks/sol-signatures.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';

// The suite mocks `idb-keyval` away for every spec. This one is about when a database comes into
// existence, so it runs against the real thing on `fake-indexeddb`.
vi.mock('idb-keyval', async () => await vi.importActual('idb-keyval'));

// Kept in a file of its own, with no shared setup: the assertion is about a realm that has done
// nothing but load the module, which stops holding once another test has read or written.
describe('idb-sol-transaction-details.api, before anything uses it', () => {
	const DB_NAME = 'oisy-sol-transaction-details';

	const databaseNames = async () => (await indexedDB.databases()).map(({ name }) => name);

	// What broke sign-out. `signOut` deletes every `oisy-` database and, after the reload,
	// `displayAndCleanLogoutMsg` deletes them again — and a delete cannot proceed against an open
	// connection. `idb-keyval` opens lazily, so no other store had one before sign-in; this module
	// opened at module scope on every page load, including the landing page, so its delete was
	// blocked and the details of the ended session stayed behind.
	it('should not create the database when the module loads', async () => {
		vi.resetModules();

		await import('$sol/api/idb-sol-transaction-details.api');

		await expect(databaseNames()).resolves.not.toContain(DB_NAME);
	});

	it('should create it once something reads', async () => {
		vi.resetModules();

		const { getIdbSolTransactionDetail } = await import('$sol/api/idb-sol-transaction-details.api');

		await getIdbSolTransactionDetail({
			address: mockSolAddress,
			network: SolanaNetworks.mainnet,
			signature: { signature: mockSolSignature(), slot: 100n }
		});

		await expect(databaseNames()).resolves.toContain(DB_NAME);
	});
});
