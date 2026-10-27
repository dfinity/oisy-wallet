import CryptoKit
import SwiftUI
import XCTest

@testable import App

@MainActor final class WelcomeViewTests: XCTestCase {
  func testParallaxStaysBoundedAndStopsWhenDisabledOrDetached() throws {
    let scene = try XCTUnwrap(UIApplication.shared.connectedScenes.first as? UIWindowScene)
    let previous = scene.keyWindow
    let window = UIWindow(windowScene: scene)
    defer {
      window.isHidden = true
      window.rootViewController = nil
      previous?.makeKey()
    }
    let controller = UIViewController()
    window.rootViewController = controller
    let artwork = WelcomeArtworkView(frame: CGRect(x: 0, y: 0, width: 393, height: 852))
    controller.view.addSubview(artwork)
    window.makeKeyAndVisible()
    artwork.update(imageName: "WelcomeObjects", motionEnabled: true)
    artwork.layoutIfNeeded()
    let image = try XCTUnwrap(artwork.subviews.first as? UIImageView)
    XCTAssertNotNil(image.image)
    let group = try XCTUnwrap(image.motionEffects.first as? UIMotionEffectGroup)
    let effects = try XCTUnwrap(group.motionEffects)
    XCTAssertEqual(effects.count, 2)
    for offset in [-1.0, 0.0, 1.0] {
      let viewer = UIOffset(horizontal: offset, vertical: offset)
      let x = try XCTUnwrap(
        effects[0].keyPathsAndRelativeValues(forViewerOffset: viewer)?[
          "layer.transform.translation.x"] as? NSNumber
      ).doubleValue
      let y = try XCTUnwrap(
        effects[1].keyPathsAndRelativeValues(forViewerOffset: viewer)?[
          "layer.transform.translation.y"] as? NSNumber
      ).doubleValue
      XCTAssertEqual(x, offset * 12, accuracy: 0.001)
      XCTAssertEqual(y, offset * 16, accuracy: 0.001)
      XCTAssertTrue(image.frame.offsetBy(dx: x, dy: y).contains(artwork.bounds))
    }
    artwork.setMotionEnabled(true)
    XCTAssertEqual(image.motionEffects.count, 1, "Updates must not stack effects")
    artwork.setMotionEnabled(false)
    XCTAssertTrue(image.motionEffects.isEmpty)
    XCTAssertTrue(CATransform3DIsIdentity(image.layer.transform))
    artwork.setMotionEnabled(true)
    XCTAssertEqual(image.motionEffects.count, 1)
    artwork.removeFromSuperview()
    XCTAssertTrue(image.motionEffects.isEmpty)
    window.rootViewController = nil
  }

  func testInactiveSceneDisablesAnActiveWelcomeEffect() async throws {
    try XCTSkipIf(UIAccessibility.isReduceMotionEnabled, "Active effects require motion enabled")
    let scene = try XCTUnwrap(UIApplication.shared.connectedScenes.first as? UIWindowScene)
    let previous = scene.keyWindow
    let window = UIWindow(windowScene: scene)
    let name = "oisy.welcome.motion.\(UUID())"
    let preferences = try XCTUnwrap(UserDefaults(suiteName: name))
    let store = KeychainStore(service: name)
    let auth = AuthModel(store: store, preferences: preferences)
    defer {
      window.isHidden = true
      window.rootViewController = nil
      previous?.makeKey()
      try? store.clear()
      preferences.removePersistentDomain(forName: name)
    }
    let controller = UIHostingController(
      rootView: SignInView {}.environment(auth))
    window.rootViewController = controller
    window.makeKeyAndVisible()
    try await Task.sleep(for: .milliseconds(200))
    let artwork = try XCTUnwrap(findArtwork(controller.view))
    let image = try XCTUnwrap(artwork.subviews.first as? UIImageView)
    XCTAssertEqual(image.motionEffects.count, 1)
    NotificationCenter.default.post(name: UIScene.willDeactivateNotification, object: scene)
    XCTAssertTrue(image.motionEffects.isEmpty, "Inactive scenes must not retain motion effects")
    XCTAssertTrue(CATransform3DIsIdentity(image.layer.transform))
    NotificationCenter.default.post(name: UIScene.didActivateNotification, object: scene)
    XCTAssertEqual(image.motionEffects.count, 1, "Returning to the scene must restore parallax")
  }

  func testFirstAndReturningWelcomeInBothAppearances() async throws {
    let preference = XCTAttachment(
      string: "System Reduce Motion: \(UIAccessibility.isReduceMotionEnabled)")
    preference.name = "welcome-system-motion-preference"
    preference.lifetime = .keepAlways
    add(preference)
    let scene = try XCTUnwrap(UIApplication.shared.connectedScenes.first as? UIWindowScene)
    let previous = scene.keyWindow
    let window = UIWindow(windowScene: scene)
    defer {
      window.isHidden = true
      window.rootViewController = nil
      previous?.makeKey()
    }
    let name = "oisy.welcome.visual.\(UUID())"
    let preferences = try XCTUnwrap(UserDefaults(suiteName: name))
    let store = KeychainStore(service: name)
    defer {
      try? store.clear()
      preferences.removePersistentDomain(forName: name)
    }
    let auth = AuthModel(store: store, preferences: preferences)
    for returning in [false, true] {
      if returning {
        try store.save(
          fixtureSession(
            key: Curve25519.Signing.PrivateKey(), expiry: .now.addingTimeInterval(600)))
        auth.restore()
        auth.restore(now: try XCTUnwrap(auth.session).expiresAt)
      }
      XCTAssertEqual(auth.showsWelcomeBack, returning)
      XCTAssertNil(auth.session)
      for dark in [false, true] {
        let controller = UIHostingController(
          rootView: SignInView {}.environment(auth))
        window.rootViewController = controller
        window.overrideUserInterfaceStyle = dark ? .dark : .light
        window.makeKeyAndVisible()
        window.layoutIfNeeded()
        if UIAccessibility.isReduceMotionEnabled {
          try await Task.sleep(for: .milliseconds(200))
          let before = UIGraphicsImageRenderer(bounds: window.bounds).pngData { _ in
            window.drawHierarchy(in: window.bounds, afterScreenUpdates: true)
          }
          try await Task.sleep(for: .milliseconds(400))
          let after = UIGraphicsImageRenderer(bounds: window.bounds).pngData { _ in
            window.drawHierarchy(in: window.bounds, afterScreenUpdates: true)
          }
          XCTAssertEqual(before, after, "Reduce Motion must keep the welcome artwork still")
        } else {
          try await Task.sleep(for: .seconds(2))
        }
        let artwork = try XCTUnwrap(findArtwork(controller.view))
        let image = try XCTUnwrap(artwork.subviews.first as? UIImageView)
        XCTAssertEqual(image.motionEffects.count, UIAccessibility.isReduceMotionEnabled ? 0 : 1)
        XCTAssertNotNil(UIImage(named: returning ? "WelcomeWallet" : "WelcomeObjects"))
        let capture = XCTAttachment(
          image: UIGraphicsImageRenderer(bounds: window.bounds).image { _ in
            window.drawHierarchy(in: window.bounds, afterScreenUpdates: true)
          })
        capture.name = "welcome-\(returning ? "returning" : "first")-\(dark ? "dark" : "light")"
        capture.lifetime = .keepAlways
        add(capture)
      }
    }
  }

  private func findArtwork(_ view: UIView) -> WelcomeArtworkView? {
    if let artwork = view as? WelcomeArtworkView { return artwork }
    return view.subviews.lazy.compactMap { self.findArtwork($0) }.first
  }

}
