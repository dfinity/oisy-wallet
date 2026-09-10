import { WALLET_PAGINATION } from '$lib/constants/app.constants';
import { last } from '$lib/utils/array.utils';
import { fetchSignatures } from '$sol/api/solana.api';
import type {
	GetSolSignaturesParams,
	SolSignaturesCursor,
	SolSignaturesPage
} from '$sol/types/sol-api';
import type { SolSignature, SolSignatureWithSources } from '$sol/types/sol-transaction';
import { isNullish, nonNullish } from '@dfinity/utils';
import { findAssociatedTokenPda } from '@solana-program/token';
import { assertIsAddress, address as solAddress, type Address } from '@solana/kit';

const findSignatureSources = async ({
	wallet,
	tokensList
}: {
	wallet: Address;
	tokensList: GetSolSignaturesParams['tokensList'];
}): Promise<Address[]> => {
	const ataAddresses = await Promise.all(
		(tokensList ?? []).map(async ({ address: tokenAddress, owner: tokenOwnerAddress }) => {
			assertIsAddress(tokenAddress);
			assertIsAddress(tokenOwnerAddress);

			const [ataAddress] = await findAssociatedTokenPda({
				owner: wallet,
				tokenProgram: solAddress(tokenOwnerAddress),
				mint: solAddress(tokenAddress)
			});

			return ataAddress;
		})
	);

	return [...new Set([wallet, ...ataAddresses])];
};

const mergeSignatureSources = (
	signatures: SolSignatureWithSources[]
): Map<SolSignature['signature'], SolSignatureWithSources> =>
	signatures.reduce((acc, solSignature) => {
		const existing = acc.get(solSignature.signature);

		acc.set(
			solSignature.signature,
			isNullish(existing)
				? solSignature
				: { ...existing, sources: [...new Set([...existing.sources, ...solSignature.sources])] }
		);

		return acc;
	}, new Map<SolSignature['signature'], SolSignatureWithSources>());

const newestSlot = (slots: SolSignature['slot'][]): SolSignature['slot'] | undefined =>
	slots.reduce<SolSignature['slot'] | undefined>(
		(acc, slot) => (isNullish(acc) || slot > acc ? slot : acc),
		undefined
	);

/**
 * Pages through the signatures without an error of a wallet and of the associated token account
 * of each token in `tokensList`, as one list: unique signatures, newest first, each tagged with
 * every source whose history holds it.
 *
 * A page ends at the cut: the newest of the oldest signatures of the sources that have not reached
 * their end. Such a source may still hold signatures older than its oldest one, even in the same
 * slot, so a page returns only the signatures strictly newer than the cut, and the cursor keeps the
 * others. Paging to the end yields every source's history, with no holes and no duplicates.
 *
 * Pass the returned cursor back to get the next page. Only a missing cursor means the end: a page
 * can be empty while a source is still paging through the cut slot. A cursor is only valid for the
 * sources it was made for, so start again without one when the token list changes. A failed lookup
 * rejects the page, so that the caller retries rather than taking a failure for the end.
 */
export const getSolSignatures = async ({
	address,
	network,
	tokensList,
	limit = Number(WALLET_PAGINATION),
	cursor
}: GetSolSignaturesParams): Promise<SolSignaturesPage> => {
	const sources = await findSignatureSources({ wallet: solAddress(address), tokensList });

	const { before = {}, exhausted = [], pending = [] } = cursor ?? {};

	const activeSources = sources.filter((source) => !exhausted.includes(source));

	// A source whose oldest signature is older than the cut already holds everything the next page
	// can return from it, so only the sources at the cut, or never asked yet, are asked again.
	const previousCutSlot = newestSlot(
		activeSources.map((source) => before[source]?.slot).filter(nonNullish)
	);

	// `Promise.all` subscribes to every lookup, so a second failure does not surface as an unhandled
	// rejection once the first one has rejected the page.
	const pages = await Promise.all(
		activeSources
			.filter((source) => isNullish(before[source]) || before[source].slot === previousCutSlot)
			.map(async (source) => ({
				source,
				signatures: await fetchSignatures({
					network,
					wallet: source,
					before: before[source]?.signature,
					limit
				})
			}))
	);

	const merged = mergeSignatureSources([
		...pending,
		...pages.flatMap(({ source, signatures }) =>
			signatures.map((solSignature) => ({ ...solSignature, sources: [source] }))
		)
	]);

	// The sort is stable, so signatures of the same slot keep the order their source returned them in.
	const newestFirst = [...merged.values()].sort(({ slot: slotA }, { slot: slotB }) =>
		slotA === slotB ? 0 : slotA > slotB ? -1 : 1
	);

	const nextExhausted = [
		...exhausted,
		...pages.filter(({ signatures }) => signatures.length < limit).map(({ source }) => source)
	];

	const nextBefore = pages.reduce<SolSignaturesCursor['before']>((acc, { source, signatures }) => {
		const oldest = last(signatures);

		return nonNullish(oldest)
			? { ...acc, [source]: { signature: oldest.signature, slot: oldest.slot } }
			: acc;
	}, before);

	const remainingSources = activeSources.filter((source) => !nextExhausted.includes(source));

	const cutSlot = newestSlot(
		remainingSources.map((source) => nextBefore[source]?.slot).filter(nonNullish)
	);

	// Every source has reached the end of its history.
	if (isNullish(cutSlot)) {
		return { signatures: newestFirst };
	}

	return {
		signatures: newestFirst.filter(({ slot }) => slot > cutSlot),
		cursor: {
			before: remainingSources.reduce<SolSignaturesCursor['before']>(
				(acc, source) => ({ ...acc, [source]: nextBefore[source] }),
				{}
			),
			exhausted: nextExhausted,
			pending: newestFirst.filter(({ slot }) => slot <= cutSlot)
		}
	};
};
