#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>
#include <arpa/inet.h>
#include <netinet/in.h>

@interface DiscoveryModule : NSObject <RCTBridgeModule, NSNetServiceBrowserDelegate, NSNetServiceDelegate>
@property (nonatomic, strong) NSNetServiceBrowser *browser;
@property (nonatomic, strong) NSMutableDictionary<NSString *, NSDictionary *> *results;
@property (nonatomic, copy) RCTPromiseResolveBlock resolver;
@property (nonatomic, copy) RCTPromiseRejectBlock rejecter;
@end

@implementation DiscoveryModule

RCT_EXPORT_MODULE();

RCT_REMAP_METHOD(discoverHosts,
                 discoverHostsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  self.results = [NSMutableDictionary dictionary];
  self.resolver = resolve;
  self.rejecter = reject;
  self.browser = [NSNetServiceBrowser new];
  self.browser.delegate = self;
  [self.browser searchForServicesOfType:@"_stratoc._tcp." inDomain:@""];
  dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.4 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
    [self finish];
  });
}

- (void)netServiceBrowser:(NSNetServiceBrowser *)browser didFindService:(NSNetService *)service moreComing:(BOOL)moreComing
{
  service.delegate = self;
  [service resolveWithTimeout:0.3];
}

- (void)netServiceDidResolveAddress:(NSNetService *)sender
{
  NSString *host = [self IPv4AddressForService:sender] ?: sender.hostName;
  if (host.length == 0) {
    return;
  }
  if ([host hasSuffix:@"."]) {
    host = [host substringToIndex:host.length - 1];
  }
  NSString *url = [NSString stringWithFormat:@"https://%@:%ld", host, (long)sender.port];
  self.results[url] = @{
    @"url": url,
    @"label": [NSString stringWithFormat:@"# %@", host],
  };
}

- (void)netService:(NSNetService *)sender didNotResolve:(NSDictionary<NSString *,NSNumber *> *)errorDict
{
  (void)sender;
  (void)errorDict;
}

- (NSString *)IPv4AddressForService:(NSNetService *)service
{
  for (NSData *addressData in service.addresses ?: @[]) {
    const struct sockaddr *address = addressData.bytes;
    if (address->sa_family != AF_INET) {
      continue;
    }
    char host[INET_ADDRSTRLEN] = {0};
    const struct sockaddr_in *ipv4 = (const struct sockaddr_in *)address;
    if (inet_ntop(AF_INET, &ipv4->sin_addr, host, sizeof(host)) == NULL) {
      continue;
    }
    return [NSString stringWithUTF8String:host];
  }
  return nil;
}

- (void)finish
{
  if (self.resolver == nil) {
    return;
  }
  [self.browser stop];
  NSArray *items = self.results.allValues ?: @[];
  self.resolver(items);
  self.resolver = nil;
  self.rejecter = nil;
  self.browser = nil;
  self.results = nil;
}

@end
