import UniformTypeIdentifiers
import WebKit
import XCTest

@testable import App

/// XCTest-only delivery of the shared web fixture; the app always loads HTTPS.
@MainActor final class WalletTestResources: NSObject, WKURLSchemeHandler {
  static func source() -> WalletTestSource { .init(handler: WalletTestResources()) }

  func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
    guard let url = task.request.url,
      let root = Bundle(for: WalletTestResources.self).resourceURL?.appendingPathComponent("public")
    else {
      task.didFailWithError(URLError(.fileDoesNotExist))
      return
    }
    let path = url.path.hasSuffix("/") || url.path.isEmpty ? url.path + "index.html" : url.path
    let file = root.appendingPathComponent(path).standardizedFileURL
    guard file.path.hasPrefix(root.path + "/"), let data = try? Data(contentsOf: file),
      let response = HTTPURLResponse(
        url: url, statusCode: 200, httpVersion: "HTTP/1.1",
        headerFields: [
          "Content-Type": UTType(filenameExtension: file.pathExtension)?.preferredMIMEType
            ?? "application/octet-stream",
          "Access-Control-Allow-Origin": "*",
        ])
    else {
      task.didFailWithError(URLError(.fileDoesNotExist))
      return
    }
    task.didReceive(response)
    task.didReceive(data)
    task.didFinish()
  }
  func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
}
