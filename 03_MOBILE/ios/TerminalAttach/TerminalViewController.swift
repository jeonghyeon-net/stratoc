import Foundation

public final class TerminalViewController {
  private let emitter: TerminalEventEmitter

  public init(emitter: TerminalEventEmitter = TerminalEventEmitter()) {
    self.emitter = emitter
  }

  public func emitCertificateChanged(hostURL: URL) {
    emitter.send(name: "terminalEvent", body: ["type": "certificate-changed", "hostUrl": hostURL.absoluteString])
  }
}
