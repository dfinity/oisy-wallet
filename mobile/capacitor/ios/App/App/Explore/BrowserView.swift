import SwiftUI

struct BrowserView: View {
  @Bindable var browser: BrowserModel
  var openWallet: () -> Void
  @State private var address = ""
  @FocusState private var addressFocused: Bool
  @Environment(\.dynamicTypeSize) private var typeSize

  var body: some View {
    VStack(spacing: 0) {
      HStack(spacing: 10) {
        Image(systemName: browser.url?.scheme == "https" ? "lock" : "globe").font(.system(size: 18))
          .foregroundStyle(.secondary)
          .accessibilityHidden(true)
        TextField("browser.address", text: $address)
          .focused($addressFocused).textInputAutocapitalization(.never).autocorrectionDisabled()
          .keyboardType(.URL)
          .submitLabel(.go).onSubmit(openAddress).accessibilityIdentifier("browser.address")
        Button(action: openAddress) {
          Image(systemName: "arrow.right.circle.fill").font(.system(size: 24)).frame(
            width: 44, height: 44)
        }
        .accessibilityLabel(Text("browser.go")).accessibilityIdentifier("browser.go")
      }
      .padding(.leading, 16).padding(.trailing, 4)
      .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 18))
      .padding(.horizontal, 20).padding(.bottom, 12)
      if browser.isLoading {
        ProgressView().progressViewStyle(.linear).accessibilityLabel(Text("browser.loading"))
      }
      if let webView = browser.webView {
        BrowserWebView(webView: webView).accessibilityIdentifier("browser.web")
      } else {
        ScrollView {
          VStack(alignment: .leading, spacing: 20) {
            Text("browser.title").font(.title2.weight(.semibold))
            Text("browser.introduction").font(.body).foregroundStyle(.secondary)
            VStack(spacing: 2) {
              appRow(
                "Uniswap", image: "Uniswap", subtitle: "browser.uniswap_description",
                website: "https://app.uniswap.org", identifier: "browser.uniswap")
              Divider().padding(.leading, 80)
              appRow(
                "1inch", image: "OneInch", subtitle: "browser.oneinch_description",
                website: "https://1inch.com/swap", identifier: "browser.oneinch")
            }.background(
              Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 24))
            Label("browser.preview_network", systemImage: "network").font(
              .subheadline.weight(.medium))
            Text("browser.preview_scope").font(.footnote).foregroundStyle(.secondary)
          }.padding(20)
        }
      }
    }
    .background(Color(.systemGroupedBackground))
    .navigationTitle("tab.browser").navigationBarTitleDisplayMode(.inline)
    .toolbar {
      if browser.webView != nil {
        ToolbarItem(placement: .topBarLeading) {
          Button {
            browser.close()
            address = ""
          } label: {
            Image(systemName: "house")
          }
          .accessibilityLabel(Text("browser.home")).accessibilityIdentifier("browser.home")
        }
        ToolbarItemGroup(placement: .topBarTrailing) {
          Button {
            browser.webView?.goBack()
          } label: {
            Image(systemName: "chevron.left")
          }
          .disabled(!browser.canGoBack).accessibilityLabel(Text("browser.back"))
          Button {
            browser.webView?.goForward()
          } label: {
            Image(systemName: "chevron.right")
          }
          .disabled(!browser.canGoForward).accessibilityLabel(Text("browser.forward"))
          Button {
            browser.webView?.reload()
          } label: {
            Image(systemName: "arrow.clockwise")
          }
          .accessibilityLabel(Text("browser.reload")).accessibilityIdentifier("browser.reload")
        }
      }
    }
    .safeAreaInset(edge: .bottom, spacing: 0) {
      if browser.webView != nil {
        VStack(alignment: .leading, spacing: 8) {
          if browser.provider.connected, let origin = browser.provider.origin {
            HStack {
              VStack(alignment: .leading, spacing: 2) {
                Text(verbatim: origin.value).font(.caption.weight(.medium)).lineLimit(1)
                Text("browser.connected").font(.caption2).foregroundStyle(.secondary)
              }
              Spacer()
              Button("browser.disconnect") { browser.provider.revoke() }
                .font(.subheadline).frame(minHeight: 44).accessibilityIdentifier(
                  "browser.disconnect")
            }
          } else if browser.provider.account?.isValid != true {
            Button("browser.open_wallet", action: openWallet).font(.subheadline)
              .frame(minHeight: 44).accessibilityIdentifier("browser.open_wallet")
          } else {
            Label("browser.ready", systemImage: "checkmark.shield").font(.caption).frame(
              minHeight: 36)
          }
        }.padding(.horizontal, 20).background(.regularMaterial)
      }
    }
    .onChange(of: browser.url, initial: true) { _, url in address = url?.absoluteString ?? "" }
    .sheet(
      item: Binding(
        get: { browser.provider.pending }, set: { if $0 == nil { browser.provider.reject() } })
    ) { request in
      BrowserConnectView(
        request: request, approve: browser.provider.approve, reject: { browser.provider.reject() }
      )
      .presentationDetents(typeSize.isAccessibilitySize ? [.large] : [.height(520), .large])
      .presentationDragIndicator(.visible)
    }
    .alert(
      "browser.error_title",
      isPresented: Binding(get: { browser.error != nil }, set: { if !$0 { browser.error = nil } })
    ) {
      Button("common.done", role: .cancel) { browser.error = nil }
    } message: {
      Text(verbatim: browser.error ?? "")
    }
  }

  private func openAddress() {
    guard let url = BrowserOrigin.website(address) else {
      browser.error = String(localized: "browser.invalid_url")
      return
    }
    addressFocused = false
    browser.open(url)
  }
  private func appRow(
    _ name: String, image: String, subtitle: LocalizedStringKey, website: String, identifier: String
  ) -> some View {
    Button {
      addressFocused = false
      if let url = URL(string: website) { browser.open(url) }
    } label: {
      Group {
        if typeSize.isAccessibilitySize {
          VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
              appIcon(image)
              Text(verbatim: name).font(.headline).foregroundStyle(.primary)
            }
            Text(subtitle).font(.subheadline).foregroundStyle(.secondary)
              .fixedSize(horizontal: false, vertical: true)
          }
        } else {
          HStack(spacing: 16) {
            appIcon(image)
            VStack(alignment: .leading, spacing: 5) {
              Text(verbatim: name).font(.headline).foregroundStyle(.primary)
              Text(subtitle).font(.subheadline).foregroundStyle(.secondary)
            }
            Spacer(minLength: 8)
            Image(systemName: "arrow.up.right").font(.system(size: 18))
              .foregroundStyle(.secondary).accessibilityHidden(true)
          }
        }
      }.frame(maxWidth: .infinity, alignment: .leading).padding(18).contentShape(Rectangle())
    }.buttonStyle(.plain).accessibilityIdentifier(identifier)
  }
  private func appIcon(_ name: String) -> some View {
    Image(name).resizable().scaledToFit().frame(width: 48, height: 48)
      .clipShape(RoundedRectangle(cornerRadius: 12)).accessibilityHidden(true)
  }
}

private struct BrowserConnectView: View {
  let request: BrowserConnectionRequest
  let approve: () -> Void
  let reject: () -> Void
  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: 20) {
          Image("OisyMark").resizable().scaledToFit().frame(width: 48, height: 48)
            .accessibilityHidden(true)
          Text(verbatim: request.origin.value).font(.title3.weight(.semibold)).textSelection(
            .enabled
          )
          .accessibilityIdentifier("browser.connect_origin")
          Text("browser.connect_description").foregroundStyle(.secondary)
          VStack(alignment: .leading, spacing: 8) {
            Text("browser.preview_network").font(.subheadline.weight(.medium))
            Text(verbatim: request.account.address).font(.footnote.monospaced()).textSelection(
              .enabled)
          }
          Text("browser.preview_scope").font(.footnote).foregroundStyle(.secondary)
        }.padding(24)
      }
      .navigationTitle("browser.connect_title").navigationBarTitleDisplayMode(.inline)
      .safeAreaInset(edge: .bottom) {
        Button("browser.connect", action: approve).buttonStyle(.borderedProminent).controlSize(
          .large
        )
        .frame(maxWidth: .infinity).padding().background(Color(.systemBackground))
        .accessibilityIdentifier("browser.approve")
      }
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("browser.cancel", action: reject).accessibilityIdentifier("browser.reject")
        }
      }
    }
  }
}
