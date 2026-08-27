/**
 * One line of the contained-instructions list.
 *
 * The sentence is composed upstream rather than assembled in the component: what a user needs to
 * read is a sentence, and its shape depends on the instruction, not on the layout.
 */
export interface SolInstructionViewRow {
	// The sentence itself, e.g. "Send 0.123 USDC to 9GJG…M8t9".
	text: string;
	// Secondary detail, shown after the sentence on the same line.
	detail?: string;
	// The legs of one routed swap. They hang under the route that produced them rather than sitting
	// flat among the top-level instructions, which is what keeps a four-leg route from reading as
	// four unrelated transfers.
	children?: SolInstructionViewRow[];
}
