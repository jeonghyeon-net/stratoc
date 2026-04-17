import Foundation

public final class HostTrustStore {
  private let defaults: UserDefaults
  private let prefix: String

  public init(
    defaults: UserDefaults = .standard,
    prefix: String = "stratoc.mobile.host-trust/"
  ) {
    self.defaults = defaults
    self.prefix = prefix
  }

  public func fingerprint(for hostURL: URL) -> String? {
    defaults.string(forKey: key(for: hostURL))
  }

  public func saveFingerprint(_ value: String, for hostURL: URL) {
    defaults.set(value, forKey: key(for: hostURL))
  }

  public func clearFingerprint(for hostURL: URL) {
    defaults.removeObject(forKey: key(for: hostURL))
  }

  private func key(for hostURL: URL) -> String {
    prefix + hostURL.absoluteString
  }
}
