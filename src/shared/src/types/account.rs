//! Account identifiers.
//!
//! An account identifier applies to a token standard.  For example, currently on the Internet
//! Computer, the token standard ICRC-1 specifies how to communicate with a token ledger and what
//! account identifiiers look like.  The same standard applies to native ICP, SNS tokens, and more.
//!
//! Similarly, EVM tokens use EVM addresses as account identifiers.  This applies to native ETH but
//! also to all ERC20 tokens.

use candid::{CandidType, Deserialize, Principal};
use serde::Serialize;

use super::token_id::TokenId;
use crate::types::network::marker_trait::{
    BitcoinMainnet, BitcoinRegtest, BitcoinTestnet, EthereumMainnet, EthereumSepolia,
    InternetComputer, Network, SolanaDevnet, SolanaLocal, SolanaMainnet, SolanaTestnet,
};

/// A marker trait, used to indicate that a type is an account identifier for a given network.
pub trait AccountId<T>
where
    T: Network,
{
}

/// An account identifier for Internet Computer tokens.
#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Eq, PartialEq)]
pub enum Icrcv2AccountId {
    /// An account identifier that declares the owner's principal.
    ///
    /// Note: Given a transaction, it is NOT typically possible to determine the owner
    /// principal & subaccount ID.  A such, this type is primarily used for internal management
    /// of accounts within a wallet.  It is not normally available for transactions with third
    /// parties.
    WithPrincipal {
        owner: Principal,
        subaccount: Option<IcrcSubaccountId>,
    },
    /// This is a redacted identifier typically available from transaction records.
    Account(IcrcSubaccountId),
}
impl AccountId<InternetComputer> for Icrcv2AccountId {}

/// An ICRC ledger account key.  Technically (and confusingly) called a subaccount ID.
#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct IcrcSubaccountId(pub [u8; 32]);

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct SolPrincipal(pub String);
impl AccountId<SolanaMainnet> for SolPrincipal {}
impl AccountId<SolanaDevnet> for SolPrincipal {}
impl AccountId<SolanaTestnet> for SolPrincipal {}
impl AccountId<SolanaLocal> for SolPrincipal {}
impl TokenId<SolanaMainnet> for SolPrincipal {}
impl TokenId<SolanaDevnet> for SolPrincipal {}
impl TokenId<SolanaTestnet> for SolPrincipal {}
impl TokenId<SolanaLocal> for SolPrincipal {}

/// A bitcoin address
///
/// # Reference
/// - <https://en.bitcoin.it/wiki/Address>
/// - <https://www.unchained.com/blog/bitcoin-address-types-compared>
#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Eq, PartialEq)]
pub enum BtcAddress {
    /// A raw public key.  Obsolete.
    ///
    /// ## Format
    /// A string, 130 characters long.
    ///
    /// ## Example
    /// - `0496b538e853519c726a2c91e61ec11600ae1390813a627c66fb8be7947be63c52da7589379515d4e0a604f8141781e62294721166bf621e73a82cbf2342c858ee`
    P2PK(String),
    /// Legacy format.
    ///
    /// This is the widely used original format encoded using Base58, which
    /// excludes characters that are frequently confused with one another.
    /// Addresses starting with “1” use the Pay-to-Public-Key-Hash (P2PKH)
    /// script type and are case-sensitive. In the context of P2PKH, “Pay-to”
    /// refers to the recipient’s ability to claim the funds, “Public-Key”
    /// refers to the recipient’s public cryptographic key, and “Hash” refers to
    /// a cryptographic hash of the public key.
    ///
    /// They offer a straightforward way to send and receive Bitcoin since they
    /// are generated from the hash of the recipient’s public key. Legacy
    /// addresses are widely compatible because the majority of wallets and
    /// exchanges support them.
    ///
    /// ## Format
    /// A string, 27-34 alphanumeric characters in length, starting with the
    /// digit "1".
    ///
    /// The string is a base58 encoded [u8;25] where the first byte is 0x00 and
    /// the last 4 bytes are a checksum.
    ///
    /// ## Example
    /// - `1RainRzqJtJxHTngafpCejDLfYq2y4KBc`
    ///
    /// ## Reference
    /// <https://en.bitcoin.it/wiki/Technical_background_of_version_1_Bitcoin_addresses>
    P2PKH(String),
    /// Pay-to-Script-Hash (P2SH)
    ///
    /// ## Format
    /// P2SH addresses are exactly 34 characters in length, and they begin with
    /// a prefix of 3, as specified by BIP 13.
    ///
    /// ## Example
    /// - `342ftSRCvFHfCeFFBuz4xwbeqnDw6BGUey`
    ///
    /// ## Reference
    /// - <https://en.bitcoin.it/wiki/BIP_0013>
    P2SH(String),
    /// Pay-to-Witness-Public-Key-Hash (P2WPKH)
    ///
    /// ## Format
    /// Pay-to-Witness-Public-Key-Hash (P2WPKH) is the first of two address
    /// types introduced to bitcoin upon the Segwit Soft Fork in August 2017.
    /// The story behind this extremely important and particularly contentious
    /// soft fork is documented in a book called The Blocksize War, written by
    /// Jonathan Bier.
    ///
    /// P2WPKH is the segwit variant of P2PKH, which at a basic level, means
    /// that choosing this address type rather than older P2PKH addresses will
    /// help you save money on transaction fees when moving your bitcoin around.
    ///
    /// Segwit addresses look quite different from the older address types
    /// because, per BIP 173, they use Bech32 encoding instead of Base58. Most
    /// notably, there are no capital letters in Bech32. P2WPKH addresses can be
    /// identified by a prefix of bc1q and a character length of exactly 42.
    ///
    /// ## Example
    /// - `bc1q34aq5drpuwy3wgl9lhup9892qp6svr8ldzyy7c`
    ///
    /// ## Reference
    /// - <https://en.bitcoin.it/wiki/BIP_0173>
    /// - <https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki>
    P2WPKH(String),
    /// Segwit format
    ///
    /// The Bitcoin network’s scalability problems were addressed with the
    /// introduction of SegWit. Addresses starting with “3” use Base58 encoding,
    /// are based on the Pay-to-Script-Hash (P2SH) script type and are
    /// case-sensitive like legacy addresses.
    ///
    /// In the context of P2SH, “Pay-to” indicates the recipient’s capability to
    /// access the funds, “Script” represents a complex set of instructions
    /// defining conditions to spend the funds, and “Hash” refers to the
    /// cryptographic hash of the script, allowing for secure transactions to
    /// addresses derived from these hashes.
    ///
    /// By separating signature data from transaction data, SegWit addresses
    /// offer many benefits, including higher transaction throughput and lower
    /// fees. This format increases the overall effectiveness of the Bitcoin
    /// network and makes it possible to integrate advanced features like the
    /// Lightning Network.
    ///
    /// ## Format
    /// A string, 34-35 alphanumeric characters in length, starting with the
    /// digit "3".
    ///
    /// The string is a base58 encoded [u8;25] where the first byte is 0x05 and
    /// the last 4 bytes are a checksum.
    ///
    /// ## Example
    /// - `3GTCwPn2EqSsAb3JDBo4WuwceVqkZjb83y`
    SegWit(String),
    /// Bech32 format
    ///
    /// Bech32 addresses are a newer format that uses a different encoding
    /// scheme and are based on the SegWit address format. They are
    /// case-sensitive and use a different character set than legacy
    /// addresses.
    ///
    /// ## Format
    /// Starts with `bc1`, and at most 90 characters long.
    ///
    /// ## Example
    /// - `bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq`
    /// - `bc1qc7slrfxkknqcq2jevvvkdgvrt8080852dfjewde450xdlk4ugp7szw5tk9`
    ///
    /// ## Reference
    /// <https://en.bitcoin.it/wiki/Bech32>
    Bech32(String),
}
impl AccountId<BitcoinMainnet> for BtcAddress {}
impl AccountId<BitcoinTestnet> for BtcAddress {}
impl AccountId<BitcoinRegtest> for BtcAddress {}
#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Eq, PartialEq)]
pub enum EthAddress {
    /// A public Ethereum address.
    ///
    /// # Format
    /// A string, 42 characters long, starting with "0x" followed by
    /// hex.  The address is case-insensitive.
    ///
    /// # Example
    /// - `0x1D1479C185d32EB90533a08b36B3CFa5F84A0E6B`
    Public(String),
}
impl AccountId<EthereumMainnet> for EthAddress {}
impl AccountId<EthereumSepolia> for EthAddress {}
impl TokenId<EthereumMainnet> for EthAddress {}
impl TokenId<EthereumSepolia> for EthAddress {}
