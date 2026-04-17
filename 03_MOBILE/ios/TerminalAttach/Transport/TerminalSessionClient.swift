import Foundation

public struct TerminalControlMessage: Codable, Equatable {
  enum CodingKeys: String, CodingKey {
    case type
    case reason
    case columns
    case rows
  }

  public let type: String
  public let reason: String?
  public let columns: UInt16?
  public let rows: UInt16?

  public init(type: String, reason: String? = nil, columns: UInt16? = nil, rows: UInt16? = nil) {
    self.type = type
    self.reason = reason
    self.columns = columns
    self.rows = rows
  }

  public func encode(to encoder: Encoder) throws {
    var container = encoder.container(keyedBy: CodingKeys.self)
    try container.encode(type, forKey: .type)
    try container.encodeIfPresent(reason, forKey: .reason)
    try container.encodeIfPresent(columns, forKey: .columns)
    try container.encodeIfPresent(rows, forKey: .rows)
  }
}

public final class TerminalSessionClient {
  public private(set) var lastConnection: (hostURL: URL, token: String, sessionName: String, columns: Int, rows: Int)?
  public private(set) var sentInput: [Data] = []
  public private(set) var lastResize: (columns: Int, rows: Int)?

  public init() {}

  public func connect(hostURL: URL, token: String, sessionName: String, columns: Int, rows: Int) {
    lastConnection = (hostURL, token, sessionName, columns, rows)
  }

  public func sendInput(_ data: Data) {
    sentInput.append(data)
  }

  public func sendResize(columns: Int, rows: Int) {
    lastResize = (columns, rows)
  }
}
