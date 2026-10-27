import AuthenticationServices
import SwiftUI

struct SignInView: View {
  var openExplore: () -> Void
  @Environment(AuthModel.self) private var auth
  @Environment(\.webAuthenticationSession) private var browser
  @Environment(\.colorScheme) private var colorScheme
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.scenePhase) private var scenePhase
  @Environment(\.dynamicTypeSize) private var typeSize
  @ScaledMetric(relativeTo: .largeTitle) private var titleSize = 44.0
  @State private var artworkSettled = false

  private var returning: Bool { auth.showsWelcomeBack }
  private var ink: Color {
    colorScheme == .dark ? .white : Color(red: 0.04, green: 0.09, blue: 0.17)
  }

  var body: some View {
    GeometryReader { geometry in
      ScrollView {
        VStack(spacing: 24) {
          header
          Spacer(minLength: typeSize.isAccessibilitySize ? 32 : 72)
          Text(returning ? "auth.returning.title" : "auth.first.title")
            .font(.system(size: titleSize, weight: .semibold))
            .tracking(-titleSize * 0.035)
            .multilineTextAlignment(.center)
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: returning ? 350 : 320)
            .accessibilityAddTraits(.isHeader)
            .accessibilityIdentifier(returning ? "auth.returning.title" : "auth.first.title")
          Spacer(minLength: 48)
          actions
        }
        .padding(.horizontal, 28)
        .padding(.top, 12)
        .padding(.bottom, 20)
        .frame(maxWidth: .infinity, minHeight: geometry.size.height)
      }
      .scrollIndicators(.hidden)
      .scrollBounceBehavior(.basedOnSize)
      .background { artwork.ignoresSafeArea() }
    }
    .foregroundStyle(ink)
    .onChange(of: auth.errorMessage) { _, message in
      if let message { AccessibilityNotification.Announcement(message).post() }
    }
  }

  private var header: some View {
    HStack {
      Image("OisyMark")
        .resizable().scaledToFit().frame(width: 44, height: 44)
        .accessibilityLabel(Text("brand.name"))
      Spacer()
      Button(action: openExplore) {
        Label("auth.explore", systemImage: "globe")
          .font(.subheadline.weight(.medium))
          .padding(.horizontal, 14).frame(minHeight: 44)
      }
      .buttonStyle(.plain)
      .background(ink.opacity(0.06), in: Capsule())
      .accessibilityIdentifier("auth.explore")
    }
  }

  private var actions: some View {
    VStack(spacing: 16) {
      if let error = auth.errorMessage {
        Text(verbatim: error)
          .font(.callout)
          .multilineTextAlignment(.center)
          .fixedSize(horizontal: false, vertical: true)
          .padding(16)
          .frame(maxWidth: .infinity)
          .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 20))
          .accessibilityIdentifier("auth.error")
      }
      Button {
        Task { await auth.signIn(using: browser) }
      } label: {
        HStack(spacing: 10) {
          if auth.isSigningIn { ProgressView().tint(.white) }
          Text(
            auth.isSigningIn
              ? "auth.signing_in" : returning ? "auth.open_wallet" : "auth.open_or_create"
          )
          .fixedSize(horizontal: false, vertical: true)
        }
        .font(.headline)
        .multilineTextAlignment(.center)
        .foregroundStyle(.white)
        .padding(.horizontal, 20).padding(.vertical, 16)
        .frame(maxWidth: .infinity, minHeight: 58)
        .background(Color("OisyBrandPrimary"), in: Capsule())
      }
      .buttonStyle(WelcomeButtonStyle())
      .disabled(auth.isSigningIn)
      .accessibilityIdentifier("auth.sign_in")
      Text("auth.continue_with_ii")
        .font(.footnote)
        .multilineTextAlignment(.center)
        .fixedSize(horizontal: false, vertical: true)
        .foregroundStyle(ink.opacity(0.75))
    }
  }

  private var artwork: some View {
    GeometryReader { geometry in
      ZStack {
        WelcomeArtwork(
          imageName: returning ? "WelcomeWallet" : "WelcomeObjects",
          motionEnabled: !reduceMotion && !auth.isSigningIn && auth.session == nil
        )
        .frame(width: geometry.size.width, height: geometry.size.height)
        .scaleEffect(artworkSettled || reduceMotion ? 1 : 1.035)
        .blur(radius: returning ? 12 : 0)
        if colorScheme == .dark {
          Color(red: 0.01, green: 0.04, blue: 0.10).opacity(0.86)
        } else if returning {
          Color.white.opacity(0.30)
        }
      }
      .overlay(alignment: .top) {
        LinearGradient(
          colors: [
            (colorScheme == .dark
              ? Color(red: 0.025, green: 0.055, blue: 0.11)
              : Color(red: 0.84, green: 0.91, blue: 1)).opacity(0.96),
            .clear,
          ], startPoint: .top, endPoint: .bottom
        ).frame(height: 190)
      }
      .frame(width: geometry.size.width, height: geometry.size.height)
      .clipped()
      .accessibilityHidden(true)
      .allowsHitTesting(false)
      // One gentle settling movement, not an endless animation behind the text.
      .onAppear { settleArtwork() }
      .onChange(of: reduceMotion) { _, reduced in
        if reduced { artworkSettled = true }
      }
      .onChange(of: scenePhase) { _, phase in
        if phase != .active { artworkSettled = true }
      }
    }
  }

  private func settleArtwork() {
    guard !reduceMotion else {
      artworkSettled = true
      return
    }
    withAnimation(.easeOut(duration: 1.6)) { artworkSettled = true }
  }
}

private struct WelcomeButtonStyle: ButtonStyle {
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .opacity(configuration.isPressed ? 0.86 : 1)
      .scaleEffect(configuration.isPressed && !reduceMotion ? 0.96 : 1)
      .animation(reduceMotion ? nil : .easeOut(duration: 0.16), value: configuration.isPressed)
  }
}
