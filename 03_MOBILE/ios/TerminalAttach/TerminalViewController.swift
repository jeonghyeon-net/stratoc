import Foundation

public final class TerminalViewController {
  private let emitter: TerminalEventEmitter

  public init(emitter: TerminalEventEmitter = TerminalEventEmitter()) {
    self.emitter = emitter
  }

  public func emitCertificateChanged(hostURL: URL) {
    emitter.send(name: "terminalEvent", body: ["type": "certificate-changed", "hostUrl": hostURL.absoluteString])
  }

  public func emitDisconnected(retrying: Bool, message: String?) {
    emitter.send(name: "terminalEvent", body: ["type": "disconnected", "retrying": retrying, "message": message as Any])
  }

  public func lastEventBody() -> [String: Any]? {
    emitter.lastBody
  }
}
