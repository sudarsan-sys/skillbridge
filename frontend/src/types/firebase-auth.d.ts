// src/types/firebase-auth.d.ts (make sure this file is included in tsconfig “types” or “include”)
import type { ReactNativeAsyncStorage } from "@react-native-async-storage/async-storage";
import type { Persistence } from "firebase/auth";
declare module "firebase/auth" {
  export function getReactNativePersistence(
    storage: ReactNativeAsyncStorage
  ): Persistence;
}
