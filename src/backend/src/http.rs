//! The data structure for HTTP requests and responses as supported natively by the replica.
//!
//! Note: I do not see these types in the SDK, which I find a bit surprising.

use candid::{CandidType, Deserialize};
use serde_bytes::ByteBuf;

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct HttpRequest {
    /// The HTTP method of the request, such as `GET` or `POST`.
    pub method: String,
    /// The requested path and query string, for example `/some/path?foo=bar`.
    ///
    /// Note: This does NOT contain the domain, port or protocol.
    pub url: String,
    /// The HTTP request headers
    pub headers: Vec<HttpHeaderField>,
    /// The complete body of the HTTP request
    pub body: ByteBuf,
}

pub type HttpHeaderField = (String, String);

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct HttpResponse {
    pub status_code: u16,
    pub headers: Vec<HttpHeaderField>,
    pub body: ByteBuf,
}
