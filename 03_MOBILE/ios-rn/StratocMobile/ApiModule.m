#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>

@interface StratocInsecureSessionDelegate : NSObject <NSURLSessionDelegate>
@end

@implementation StratocInsecureSessionDelegate

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

@interface ApiModule : NSObject <RCTBridgeModule>
@property (nonatomic, strong) StratocInsecureSessionDelegate *sessionDelegate;
@property (nonatomic, strong) NSURLSession *session;
@end

@implementation ApiModule

RCT_EXPORT_MODULE();

- (instancetype)init
{
  self = [super init];
  if (self) {
    _sessionDelegate = [StratocInsecureSessionDelegate new];
    NSURLSessionConfiguration *configuration = [NSURLSessionConfiguration ephemeralSessionConfiguration];
    configuration.timeoutIntervalForRequest = 5.0;
    configuration.timeoutIntervalForResource = 5.0;
    _session = [NSURLSession sessionWithConfiguration:configuration delegate:_sessionDelegate delegateQueue:nil];
  }
  return self;
}

RCT_REMAP_METHOD(request,
                 requestWithPayload:(NSDictionary *)payload
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  NSString *baseURL = payload[@"baseUrl"];
  NSString *path = payload[@"path"];
  NSString *method = payload[@"method"];
  NSString *token = payload[@"token"];
  NSString *body = payload[@"body"];
  if (baseURL.length == 0 || path.length == 0 || method.length == 0) {
    reject(@"request_invalid", @"baseUrl/path/method required", nil);
    return;
  }

  NSURL *url = [self requestURLWithBaseURL:baseURL path:path];
  if (url == nil) {
    reject(@"request_invalid", @"invalid request url", nil);
    return;
  }

  NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:url];
  request.HTTPMethod = method;
  if (token.length > 0) {
    [request setValue:[NSString stringWithFormat:@"Bearer %@", token] forHTTPHeaderField:@"Authorization"];
  }
  if (body.length > 0) {
    request.HTTPBody = [body dataUsingEncoding:NSUTF8StringEncoding];
    [request setValue:@"application/json" forHTTPHeaderField:@"Content-Type"];
  }

  NSURLSessionDataTask *task = [self.session dataTaskWithRequest:request
                                               completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
    if (error != nil) {
      reject(@"request_failed", error.localizedDescription, error);
      return;
    }
    NSHTTPURLResponse *httpResponse = (NSHTTPURLResponse *)response;
    NSString *responseBody = [[NSString alloc] initWithData:data ?: [NSData data] encoding:NSUTF8StringEncoding] ?: @"";
    resolve(@{
      @"status": @(httpResponse.statusCode),
      @"body": responseBody,
    });
  }];
  [task resume];
}

- (NSURL *)requestURLWithBaseURL:(NSString *)baseURL path:(NSString *)path
{
  NSString *normalized = [baseURL containsString:@"://"] ? baseURL : [@"https://" stringByAppendingString:baseURL];
  NSURLComponents *components = [NSURLComponents componentsWithString:normalized];
  if (components == nil || ![components.scheme.lowercaseString isEqualToString:@"https"] || components.host.length == 0) {
    return nil;
  }
  components.path = path;
  components.query = nil;
  components.fragment = nil;
  return components.URL;
}

@end
