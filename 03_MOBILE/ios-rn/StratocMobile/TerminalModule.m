#import <Foundation/Foundation.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTBridgeModule.h>

@interface StratocTerminalSessionDelegate : NSObject <NSURLSessionDelegate>
@end

@implementation StratocTerminalSessionDelegate

- (void)URLSession:(NSURLSession *)session
didReceiveChallenge:(NSURLAuthenticationChallenge *)challenge
 completionHandler:(void (^)(NSURLSessionAuthChallengeDisposition disposition, NSURLCredential * _Nullable credential))completionHandler
{
  if ([challenge.protectionSpace.authenticationMethod isEqualToString:NSURLAuthenticationMethodServerTrust]) {
    SecTrustRef trust = challenge.protectionSpace.serverTrust;
    if (trust != nil) {
      completionHandler(NSURLSessionAuthChallengeUseCredential, [NSURLCredential credentialForTrust:trust]);
      return;
    }
  }
  completionHandler(NSURLSessionAuthChallengePerformDefaultHandling, nil);
}

@end

@interface TerminalModule : RCTEventEmitter <RCTBridgeModule>
@property (nonatomic, strong) StratocTerminalSessionDelegate *sessionDelegate;
@property (nonatomic, strong) NSURLSession *session;
@property (nonatomic, strong) NSURLSessionWebSocketTask *socket;
@end

@implementation TerminalModule

RCT_EXPORT_MODULE();

- (instancetype)init
{
  self = [super init];
  if (self) {
    _sessionDelegate = [StratocTerminalSessionDelegate new];
    NSURLSessionConfiguration *configuration = [NSURLSessionConfiguration ephemeralSessionConfiguration];
    configuration.timeoutIntervalForRequest = 5.0;
    configuration.timeoutIntervalForResource = 0;
    _session = [NSURLSession sessionWithConfiguration:configuration delegate:_sessionDelegate delegateQueue:nil];
  }
  return self;
}

- (NSArray<NSString *> *)supportedEvents
{
  return @[@"terminalEvent", @"terminalOutput"];
}

RCT_REMAP_METHOD(openTerminalSession,
                 openTerminalSessionWithPayload:(NSDictionary *)payload
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  NSString *hostURL = payload[@"hostUrl"];
  NSString *sessionName = payload[@"sessionName"];
  NSString *token = payload[@"authToken"] ?: @"";
  NSNumber *columns = payload[@"columns"];
  NSNumber *rows = payload[@"rows"];
  NSURLRequest *request = [self requestForHostURL:hostURL
                                      sessionName:sessionName
                                            token:token
                                          columns:columns
                                             rows:rows];
  if (request == nil) {
    reject(@"terminal_open_failed", @"invalid terminal request", nil);
    return;
  }

  [self.socket cancelWithCloseCode:NSURLSessionWebSocketCloseCodeNormalClosure reason:nil];
  self.socket = [self.session webSocketTaskWithRequest:request];
  [self.socket resume];

  __weak typeof(self) weakSelf = self;
  [self.socket sendPingWithPongReceiveHandler:^(NSError *error) {
    __strong typeof(self) self = weakSelf;
    if (self == nil) {
      return;
    }
    if (error != nil) {
      [self sendEventWithName:@"terminalEvent" body:@{ @"type": @"closed", @"reason": @"error" }];
      [self sendEventWithName:@"terminalEvent" body:@{ @"type": @"disconnected", @"retrying": @NO, @"message": error.localizedDescription ?: @"connection failed" }];
      reject(@"terminal_open_failed", error.localizedDescription, error);
      return;
    }
    [self sendEventWithName:@"terminalEvent" body:@{ @"type": @"opened", @"sessionName": sessionName ?: @"" }];
    [self receiveNextMessage];
    resolve(nil);
  }];
}

RCT_REMAP_METHOD(sendInput,
                 sendInputText:(NSString *)text
                 sendInputResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  if (self.socket == nil) {
    reject(@"terminal_send_failed", @"terminal not connected", nil);
    return;
  }
  NSData *data = [text dataUsingEncoding:NSUTF8StringEncoding];
  [self.socket sendMessage:[[NSURLSessionWebSocketMessage alloc] initWithData:data]
         completionHandler:^(NSError *error) {
    if (error != nil) {
      reject(@"terminal_send_failed", error.localizedDescription, error);
      return;
    }
    resolve(nil);
  }];
}

RCT_REMAP_METHOD(resize,
                 resizeColumns:(nonnull NSNumber *)columns
                 rows:(nonnull NSNumber *)rows
                 resizeResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  if (self.socket == nil) {
    reject(@"terminal_resize_failed", @"terminal not connected", nil);
    return;
  }
  NSString *payload = [NSString stringWithFormat:@"{\"type\":\"resize\",\"columns\":%d,\"rows\":%d}", columns.intValue, rows.intValue];
  [self.socket sendMessage:[[NSURLSessionWebSocketMessage alloc] initWithString:payload]
         completionHandler:^(NSError *error) {
    if (error != nil) {
      reject(@"terminal_resize_failed", error.localizedDescription, error);
      return;
    }
    resolve(nil);
  }];
}

RCT_REMAP_METHOD(close,
                 closeWithReason:(NSString *)reason
                 closeResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  NSData *payload = reason.length > 0 ? [reason dataUsingEncoding:NSUTF8StringEncoding] : nil;
  [self.socket cancelWithCloseCode:NSURLSessionWebSocketCloseCodeNormalClosure reason:payload];
  self.socket = nil;
  resolve(nil);
}

- (void)receiveNextMessage
{
  if (self.socket == nil) {
    return;
  }
  __weak typeof(self) weakSelf = self;
  [self.socket receiveMessageWithCompletionHandler:^(NSURLSessionWebSocketMessage *message, NSError *error) {
    __strong typeof(self) self = weakSelf;
    if (self == nil) {
      return;
    }
    if (error != nil) {
      self.socket = nil;
      [self sendEventWithName:@"terminalEvent" body:@{ @"type": @"disconnected", @"retrying": @NO, @"message": error.localizedDescription ?: @"error" }];
      [self sendEventWithName:@"terminalEvent" body:@{ @"type": @"closed", @"reason": @"error" }];
      return;
    }
    if (message.type == NSURLSessionWebSocketMessageTypeData) {
      NSString *text = [[NSString alloc] initWithData:message.data encoding:NSUTF8StringEncoding] ?: @"";
      [self sendEventWithName:@"terminalOutput" body:@{ @"data": text }];
    } else if (message.type == NSURLSessionWebSocketMessageTypeString) {
      NSString *text = message.string ?: @"";
      if ([text containsString:@"\"type\":\"disconnect\""]) {
        NSString *reason = [self disconnectReasonFromText:text] ?: @"disconnected";
        [self sendEventWithName:@"terminalEvent" body:@{ @"type": @"disconnected", @"retrying": @NO, @"message": reason }];
      } else {
        [self sendEventWithName:@"terminalOutput" body:@{ @"data": text }];
      }
    }
    [self receiveNextMessage];
  }];
}

- (NSURLRequest *)requestForHostURL:(NSString *)hostURL
                        sessionName:(NSString *)sessionName
                              token:(NSString *)token
                            columns:(NSNumber *)columns
                               rows:(NSNumber *)rows
{
  if (hostURL.length == 0 || sessionName.length == 0) {
    return nil;
  }
  NSString *normalized = [hostURL containsString:@"://"] ? hostURL : [@"https://" stringByAppendingString:hostURL];
  NSURLComponents *components = [NSURLComponents componentsWithString:normalized];
  if (components == nil || ![components.scheme.lowercaseString isEqualToString:@"https"] || components.host.length == 0) {
    return nil;
  }
  components.scheme = @"wss";
  components.path = [NSString stringWithFormat:@"/api/sessions/%@/attach", [sessionName stringByAddingPercentEncodingWithAllowedCharacters:[NSCharacterSet URLPathAllowedCharacterSet]] ?: sessionName];
  components.query = nil;
  components.fragment = nil;
  NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:components.URL];
  [request setValue:[NSString stringWithFormat:@"Bearer %@", token] forHTTPHeaderField:@"Authorization"];
  [request setValue:[NSString stringWithFormat:@"%d", columns != nil ? columns.intValue : 120] forHTTPHeaderField:@"X-Terminal-Columns"];
  [request setValue:[NSString stringWithFormat:@"%d", rows != nil ? rows.intValue : 40] forHTTPHeaderField:@"X-Terminal-Rows"];
  return request;
}

- (NSString *)disconnectReasonFromText:(NSString *)text
{
  NSRange marker = [text rangeOfString:@"\"reason\":\""];
  if (marker.location == NSNotFound) {
    return nil;
  }
  NSUInteger start = marker.location + marker.length;
  NSRange rest = NSMakeRange(start, text.length - start);
  NSRange end = [text rangeOfString:@"\"" options:0 range:rest];
  if (end.location == NSNotFound) {
    return nil;
  }
  return [text substringWithRange:NSMakeRange(start, end.location - start)];
}

@end
