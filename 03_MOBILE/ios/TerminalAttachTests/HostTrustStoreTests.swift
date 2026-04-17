import Foundation
import Testing
@testable import TerminalAttach

@Test
func hostTrustStorePersistsFingerprintByAbsoluteURL() {
  let store = HostTrustStore()
  let hostURL = URL(string: "https://10.0.0.2:8443")!
  store.saveFingerprint("abc", for: hostURL)
  #expect(store.fingerprint(for: hostURL) == "abc")
}
