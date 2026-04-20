#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>
#import <Security/Security.h>

@interface SecureStorageModule : NSObject <RCTBridgeModule>
@end

@implementation SecureStorageModule

RCT_EXPORT_MODULE();

RCT_REMAP_METHOD(getItem,
                 getItemWithKey:(NSString *)key
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  NSData *data = [self dataForKey:key error:nil];
  if (data == nil) {
    resolve((id)kCFNull);
    return;
  }
  NSString *value = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
  resolve(value ?: (id)kCFNull);
}

RCT_REMAP_METHOD(setItem,
                 setItemWithKey:(NSString *)key
                 value:(NSString *)value
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  NSData *data = [value dataUsingEncoding:NSUTF8StringEncoding];
  NSDictionary *query = [self queryForKey:key];
  OSStatus updateStatus = SecItemUpdate((__bridge CFDictionaryRef)query, (__bridge CFDictionaryRef)@{(__bridge id)kSecValueData: data});
  if (updateStatus == errSecSuccess) {
    resolve(nil);
    return;
  }
  NSMutableDictionary *item = [query mutableCopy];
  item[(__bridge id)kSecValueData] = data;
  OSStatus addStatus = SecItemAdd((__bridge CFDictionaryRef)item, nil);
  if (addStatus != errSecSuccess) {
    reject(@"secure_storage_write_failed", [NSString stringWithFormat:@"status %d", (int)addStatus], nil);
    return;
  }
  resolve(nil);
}

RCT_REMAP_METHOD(removeItem,
                 removeItemWithKey:(NSString *)key
                 removeResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  OSStatus status = SecItemDelete((__bridge CFDictionaryRef)[self queryForKey:key]);
  if (status != errSecSuccess && status != errSecItemNotFound) {
    reject(@"secure_storage_remove_failed", [NSString stringWithFormat:@"status %d", (int)status], nil);
    return;
  }
  resolve(nil);
}

- (NSDictionary *)queryForKey:(NSString *)key
{
  return @{
    (__bridge id)kSecClass: (__bridge id)kSecClassGenericPassword,
    (__bridge id)kSecAttrService: @"com.stratocmobile.secure-storage",
    (__bridge id)kSecAttrAccount: key,
  };
}

- (NSData *)dataForKey:(NSString *)key error:(NSError **)error
{
  NSMutableDictionary *query = [[self queryForKey:key] mutableCopy];
  query[(__bridge id)kSecReturnData] = @YES;
  query[(__bridge id)kSecMatchLimit] = (__bridge id)kSecMatchLimitOne;

  CFTypeRef result = nil;
  OSStatus status = SecItemCopyMatching((__bridge CFDictionaryRef)query, &result);
  if (status == errSecItemNotFound) {
    return nil;
  }
  if (status != errSecSuccess) {
    if (error != nil) {
      *error = [NSError errorWithDomain:NSOSStatusErrorDomain code:status userInfo:nil];
    }
    return nil;
  }
  return CFBridgingRelease(result);
}

@end
