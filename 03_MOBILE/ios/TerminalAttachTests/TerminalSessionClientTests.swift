import Foundation
import Testing
@testable import TerminalAttach

@Test
func attachRequestUsesWssAndHeaders() throws {
  let request = try attachRequest(
    hostURL: URL(string: "https://10.0.0.2:62589")!,
    token: "secret",
    sessionName: "session-0001",
    columns: 120,
    rows: 40
  )

  #expect(request.url?.absoluteString == "wss://10.0.0.2:62589/api/sessions/session-0001/attach")
  #expect(request.value(forHTTPHeaderField: "Authorization") == "Bearer secret")
  #expect(request.value(forHTTPHeaderField: "X-Terminal-Columns") == "120")
  #expect(request.value(forHTTPHeaderField: "X-Terminal-Rows") == "40")
}

private final class WebSocketSpy: WebSocketSending {
  var resumed = false
  var binaryMessages: [Data] = []
  var textMessages: [String] = []

  func resume() {
    resumed = true
  }

  func send(data: Data) async throws {
    binaryMessages.append(data)
  }

  func send(text: String) async throws {
    textMessages.append(text)
  }
}

@Test
func terminalSessionClientSendsBinaryAndResizeControl() async throws {
  let spy = WebSocketSpy()
  let client = TerminalSessionClient(taskFactory: { request in
    #expect(request.url?.scheme == "wss")
    return spy
  })

  try client.connect(
    hostURL: URL(string: "https://10.0.0.2:62589")!,
    token: "secret",
    sessionName: "session-0001",
    columns: 120,
    rows: 40
  )
  try await client.sendInput(Data("ls\n".utf8))
  try await client.sendResize(columns: 100, rows: 30)

  #expect(spy.resumed)
  #expect(spy.binaryMessages == [Data("ls\n".utf8)])
  #expect(spy.textMessages.count == 1)
  #expect(spy.textMessages.first?.contains("\"type\":\"resize\"") == true)
}
