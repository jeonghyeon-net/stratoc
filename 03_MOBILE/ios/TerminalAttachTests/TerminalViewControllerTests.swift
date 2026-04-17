import Foundation
import Testing
@testable import TerminalAttach

@Test
func terminalViewControllerEmitsCertificateChanged() {
  let emitter = TerminalEventEmitter()
  let controller = TerminalViewController(emitter: emitter)

  controller.emitCertificateChanged(hostURL: URL(string: "https://10.0.0.2:8443")!)

  #expect(emitter.lastName == "terminalEvent")
  #expect(emitter.lastBody?["type"] as? String == "certificate-changed")
  #expect(emitter.lastBody?["hostUrl"] as? String == "https://10.0.0.2:8443")
}

@Test
func terminalViewControllerEmitsDisconnected() {
  let emitter = TerminalEventEmitter()
  let controller = TerminalViewController(emitter: emitter)

  controller.emitDisconnected(retrying: true, message: "network lost")

  #expect(emitter.lastBody?["type"] as? String == "disconnected")
  #expect(emitter.lastBody?["retrying"] as? Bool == true)
  #expect(emitter.lastBody?["message"] as? String == "network lost")
}
