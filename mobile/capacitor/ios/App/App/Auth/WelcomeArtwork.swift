import SwiftUI
import UIKit

/// Only the illustration moves; the SwiftUI text, controls and contrast layers stay still.
struct WelcomeArtwork: UIViewRepresentable {
  let imageName: String
  let motionEnabled: Bool

  func makeUIView(context: Context) -> WelcomeArtworkView { WelcomeArtworkView() }

  func updateUIView(_ view: WelcomeArtworkView, context: Context) {
    view.update(imageName: imageName, motionEnabled: motionEnabled)
  }

  static func dismantleUIView(_ view: WelcomeArtworkView, coordinator: Void) {
    view.setMotionEnabled(false)
  }
}

final class WelcomeArtworkView: UIView {
  private let imageView = UIImageView()
  private var imageName: String?
  private var motionEnabled = false
  private var sceneActive = false

  override init(frame: CGRect) {
    super.init(frame: frame)
    isUserInteractionEnabled = false
    accessibilityElementsHidden = true
    imageView.contentMode = .scaleAspectFill
    imageView.clipsToBounds = true
    addSubview(imageView)
    NotificationCenter.default.addObserver(
      self, selector: #selector(sceneActivated(_:)), name: UIScene.didActivateNotification,
      object: nil)
    NotificationCenter.default.addObserver(
      self, selector: #selector(sceneDeactivated(_:)), name: UIScene.willDeactivateNotification,
      object: nil)
  }

  required init?(coder: NSCoder) { nil }

  override func layoutSubviews() {
    super.layoutSubviews()
    // Extra artwork covers both the maximum tilt and the returning screen's blur.
    imageView.bounds = CGRect(
      origin: .zero, size: CGSize(width: bounds.width + 64, height: bounds.height + 64))
    imageView.center = CGPoint(x: bounds.midX, y: bounds.midY)
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    sceneActive = window?.windowScene?.activationState == .foregroundActive
    updateMotionEffects()
  }

  func update(imageName: String, motionEnabled: Bool) {
    if self.imageName != imageName {
      self.imageName = imageName
      imageView.image = UIImage(named: imageName)
    }
    setMotionEnabled(motionEnabled)
  }

  func setMotionEnabled(_ enabled: Bool) {
    motionEnabled = enabled
    updateMotionEffects()
  }

  @objc private func sceneActivated(_ notification: Notification) {
    guard let scene = notification.object as? UIWindowScene, scene === window?.windowScene else {
      return
    }
    sceneActive = true
    updateMotionEffects()
  }

  @objc private func sceneDeactivated(_ notification: Notification) {
    guard let scene = notification.object as? UIWindowScene, scene === window?.windowScene else {
      return
    }
    sceneActive = false
    updateMotionEffects()
  }

  private func updateMotionEffects() {
    guard motionEnabled && sceneActive && window != nil else {
      for effect in imageView.motionEffects { imageView.removeMotionEffect(effect) }
      UIView.performWithoutAnimation { imageView.layer.transform = CATransform3DIdentity }
      return
    }
    guard imageView.motionEffects.isEmpty else { return }
    // UIKit handles tilt filtering and interpolation; no raw sensor stream or timer.
    let horizontal = UIInterpolatingMotionEffect(
      keyPath: "layer.transform.translation.x", type: .tiltAlongHorizontalAxis)
    horizontal.minimumRelativeValue = -12
    horizontal.maximumRelativeValue = 12
    let vertical = UIInterpolatingMotionEffect(
      keyPath: "layer.transform.translation.y", type: .tiltAlongVerticalAxis)
    vertical.minimumRelativeValue = -16
    vertical.maximumRelativeValue = 16
    let group = UIMotionEffectGroup()
    group.motionEffects = [horizontal, vertical]
    imageView.addMotionEffect(group)
  }
}
