import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

/**
 * Subscribes to connectivity and reports whether the device is offline
 * (Requirement 9.7). Treats "connected but internet unreachable" as offline so
 * the banner reflects real reachability, not just a radio being on.
 */
export function useOfflineStatus(): boolean {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected) && state.isInternetReachable !== false;
      setOffline(!online);
    });
    return () => unsubscribe();
  }, []);

  return offline;
}
