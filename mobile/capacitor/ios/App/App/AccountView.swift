import SwiftUI

/// Native account controls; wallet content and contacts stay in the shared WebView.
struct AccountView: View {
  @Environment(AuthModel.self) private var auth
  @Environment(\.dismiss) private var dismiss
  @Bindable var browser: BrowserModel
  let showWebScreen: (String) -> Void
  @State private var confirmingSignOut = false

  var body: some View {
    NavigationStack {
      List {
        Section {
          HStack(spacing: 16) {
            Image("OisyMark").resizable().scaledToFit().frame(width: 40, height: 40)
              .accessibilityHidden(true)
            VStack(alignment: .leading) {
              Text("account.my_wallet").font(.headline)
              Text("account.internet_identity").font(.subheadline).foregroundStyle(.secondary)
            }
          }.padding(.vertical, 12)
          Button("account.contacts") { showWebScreen("contacts") }
          Button("account.web_preferences") { showWebScreen("preferences") }
          Button("browser.reload") { showWebScreen("reload") }
        }
        Section("account.connected_apps") {
          if browser.provider.grants.isEmpty {
            Text("account.no_connections").foregroundStyle(.secondary)
          }
          ForEach(browser.provider.grants.sorted(), id: \.self) { origin in
            VStack(alignment: .leading, spacing: 8) {
              Text(verbatim: origin).font(.subheadline)
              Button("browser.disconnect", role: .destructive) {
                browser.provider.revoke(origin: origin)
              }
            }
          }
        }
        Section("account.security") {
          if let url = URL(string: "https://id.ai/manage") {
            Link("account.manage_identity", destination: url)
          }
          Button("auth.sign_out", role: .destructive) { confirmingSignOut = true }
            .accessibilityIdentifier("auth.sign_out")
        }
        Section { Text("auth.audit_environment").font(.footnote).foregroundStyle(.secondary) }
      }
      .navigationTitle("wallet.account").navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .confirmationAction) { Button("browser.done") { dismiss() } }
      }
      .confirmationDialog(
        "account.sign_out_title", isPresented: $confirmingSignOut,
        titleVisibility: .visible
      ) {
        Button("auth.sign_out", role: .destructive) {
          auth.signOut()
          dismiss()
        }
      } message: {
        Text("account.sign_out_description")
      }
    }
  }
}
