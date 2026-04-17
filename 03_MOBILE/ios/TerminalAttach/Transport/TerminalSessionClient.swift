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
  public private(set) var lastRequest: URLRequest?
  public private(set) var sentInput: [Data] = []
  public private(set) var lastResize: (columns: Int, rows: Int)?

  private let taskFactory: (URLRequest) -> WebSocketSending
  private let encoder = JSONEncoder()
  private var socket: WebSocketSending?

  public init(taskFactory: @escaping (URLRequest) -> WebSocketSending = { request in
    URLSession.shared.webSocketTask(with: request)
  }) {
    self.taskFactory = taskFactory
  }

  public func connect(hostURL: URL, token: String, sessionName: String, columns: Int, rows: Int) throws {
    let request = try attachRequest(hostURL: hostURL, token: token, sessionName: sessionName, columns: columns, rows: rows)
    lastRequest = request
    let socket = taskFactory(request)
    socket.resume()
    self.socket = socket
  }

  public func sendInput(_ data: Data) async throws {
    sentInput.append(data)
    try await socket?.send(data: data)
  }

  public func sendResize(columns: Int, rows: Int) async throws {
    lastResize = (columns, rows)
    let payload = try encoder.encode(TerminalControlMessage(type: "resize", columns: UInt16(columns), rows: UInt16(rows)))
    try await socket?.send(text: String(decoding: payload, as: UTF8.self))
  }
}

public func attachRequest(hostURL: URL, token: String, sessionName: String, columns: Int, rows: Int) throws -> URLRequest {
  guard let scheme = hostURL.scheme, scheme == "https" else {
    throw URLError(.unsupportedURL)
  }
  var components = URLComponents(url: hostURL, resolvingAgainstBaseURL: false)
  components?.scheme = "wss"
  components?.path = "/api/sessions/\(sessionName.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? sessionName)/attach"
  guard let url = components?.url else {
    throw URLError(.badURL)
  }
  var request = URLRequest(url: url)
  request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
  request.setValue(String(columns), forHTTPHeaderField: "X-Terminal-Columns")
  request.setValue(String(rows), forHTTPHeaderField: "X-Terminal-Rows")
  return request
}

public protocol WebSocketSending {
  func resume()
  func send(data: Data) async throws
  func send(text: String) async throws
}

extension URLSessionWebSocketTask: WebSocketSending {
  public func send(data: Data) async throws {
    try await send(.data(data))
  }

  public func send(text: String) async throws {
    try await send(.string(text))
  }
}
