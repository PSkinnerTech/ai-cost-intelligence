// src/hooks/useWebSocket.ts
// Custom hook for real-time WebSocket updates

import { useState, useEffect, useRef, useCallback } from 'react';

interface WebSocketMessage {
  type: 'cost_update' | 'test_complete' | 'trace_update' | 'error';
  data: any;
  timestamp: string;
}

interface UseWebSocketOptions {
  url: string;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  silentMode?: boolean;
  enabled?: boolean; // New option to disable WebSocket completely
}

interface UseWebSocketReturn {
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  sendMessage: (message: any) => void;
  connect: () => void;
  disconnect: () => void;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error' | 'disabled';
}

export const useWebSocket = (options: UseWebSocketOptions): UseWebSocketReturn => {
  const {
    url,
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    reconnectAttempts = 1, // Reduced to 1 attempt
    reconnectInterval = 15000, // Increased to 15 seconds
    silentMode = true, // Default to silent
    enabled = false // Default to disabled in production
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error' | 'disabled'>('disabled');
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectCountRef = useRef(0);
  const isConnectingRef = useRef(false);

  const memoizedOnMessage = useRef(onMessage);
  const memoizedOnConnect = useRef(onConnect);
  const memoizedOnDisconnect = useRef(onDisconnect);
  const memoizedOnError = useRef(onError);

  useEffect(() => {
    memoizedOnMessage.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    memoizedOnConnect.current = onConnect;
  }, [onConnect]);

  useEffect(() => {
    memoizedOnDisconnect.current = onDisconnect;
  }, [onDisconnect]);

  useEffect(() => {
    memoizedOnError.current = onError;
  }, [onError]);

  const connect = useCallback(() => {
    // Don't connect if disabled
    if (!enabled) {
      setConnectionStatus('disabled');
      return;
    }

    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    isConnectingRef.current = true;
    setConnectionStatus('connecting');
    
    try {
      // Ensure clean URL without trailing slash
      const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
      wsRef.current = new WebSocket(cleanUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectCountRef.current = 0;
        isConnectingRef.current = false;
        memoizedOnConnect.current?.();
        if (!silentMode) {
          console.log('✅ WebSocket connected to:', url);
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          memoizedOnMessage.current?.(message);
        } catch (error) {
          if (!silentMode) {
            console.error('Failed to parse WebSocket message:', error);
          }
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        setConnectionStatus('disconnected');
        isConnectingRef.current = false;
        memoizedOnDisconnect.current?.();
        
        // Only attempt reconnect if enabled and under limit
        if (enabled && reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current++;
          if (!silentMode) {
            console.log(`🔄 WebSocket reconnecting (${reconnectCountRef.current}/${reconnectAttempts})...`);
          }
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else {
          setConnectionStatus('error');
        }
      };

      wsRef.current.onerror = (error) => {
        setConnectionStatus('error');
        isConnectingRef.current = false;
        memoizedOnError.current?.(error);
        
        // Completely silent on error unless explicitly enabled
        if (!silentMode && enabled) {
          console.log('⚠️ WebSocket connection failed - real-time features unavailable');
        }
      };

    } catch (error) {
      setConnectionStatus('error');
      isConnectingRef.current = false;
      // Silent error handling
    }
  }, [url, reconnectAttempts, reconnectInterval, silentMode, enabled]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setConnectionStatus('disabled');
    isConnectingRef.current = false;
    reconnectCountRef.current = 0;
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message));
      } catch (error) {
        // Silent failure
      }
    }
    // Silent when not connected
  }, []);

  useEffect(() => {
    if (enabled) {
      // Only connect if enabled and add delay to avoid startup noise
      const connectTimeout = setTimeout(() => {
        connect();
      }, 5000); // 5 second delay

      return () => {
        clearTimeout(connectTimeout);
        disconnect();
      };
    } else {
      setConnectionStatus('disabled');
    }
  }, [connect, disconnect, enabled]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    connect,
    disconnect,
    connectionStatus
  };
};

// Specialized hooks for different types of real-time updates

export const useCostUpdates = () => {
  const [costs, setCosts] = useState<any[]>([]);
  const [totalCost, setTotalCost] = useState(0);

  const getWebSocketURL = () => {
    // Only enable WebSocket in development with Phoenix server
    const isDev = process.env.NODE_ENV === 'development';
    return isDev ? 'ws://localhost:6006' : '';
  };

  const isWebSocketEnabled = () => {
    // Only enable in development when Phoenix server might be available
    return process.env.NODE_ENV === 'development';
  };

  const handleMessage = useCallback((message: WebSocketMessage) => {
    if (message.type === 'cost_update') {
      setCosts(prev => [...prev, message.data]);
      setTotalCost(prev => prev + (message.data.cost || 0));
    }
  }, []);

  const wsUrl = getWebSocketURL();
  const { isConnected, connectionStatus } = useWebSocket({
    url: wsUrl,
    onMessage: handleMessage,
    silentMode: true,
    enabled: isWebSocketEnabled() && !!wsUrl
  });

  return { costs, totalCost, isConnected, connectionStatus };
};

export const useTestResults = () => {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [currentTest, setCurrentTest] = useState<any>(null);

  const getWebSocketURL = () => {
    const isDev = process.env.NODE_ENV === 'development';
    return isDev ? 'ws://localhost:6006' : '';
  };

  const isWebSocketEnabled = () => {
    return process.env.NODE_ENV === 'development';
  };

  const handleMessage = useCallback((message: WebSocketMessage) => {
    if (message.type === 'test_complete') {
      setTestResults(prev => [...prev, message.data]);
      setCurrentTest(null);
    }
  }, []);

  const wsUrl = getWebSocketURL();
  const { isConnected, connectionStatus, sendMessage } = useWebSocket({
    url: wsUrl,
    onMessage: handleMessage,
    silentMode: true,
    enabled: isWebSocketEnabled() && !!wsUrl
  });

  const startTest = useCallback((testConfig: any) => {
    setCurrentTest(testConfig);
    sendMessage({ type: 'start_test', data: testConfig });
  }, [sendMessage]);

  return { testResults, currentTest, isConnected, connectionStatus, startTest };
};

export const useTraceUpdates = () => {
  const [traces, setTraces] = useState<any[]>([]);
  const [activeSpans, setActiveSpans] = useState<any[]>([]);

  const getWebSocketURL = () => {
    const isDev = process.env.NODE_ENV === 'development';
    return isDev ? 'ws://localhost:6006' : '';
  };

  const isWebSocketEnabled = () => {
    return process.env.NODE_ENV === 'development';
  };

  const handleMessage = useCallback((message: WebSocketMessage) => {
    if (message.type === 'trace_update') {
      setTraces(prev => {
        const existingIndex = prev.findIndex(t => t.traceId === message.data.traceId);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = message.data;
          return updated;
        }
        return [...prev, message.data];
      });

      if (message.data.spans) {
        setActiveSpans(message.data.spans);
      }
    }
  }, []);

  const wsUrl = getWebSocketURL();
  const { isConnected, connectionStatus } = useWebSocket({
    url: wsUrl,
    onMessage: handleMessage,
    silentMode: true,
    enabled: isWebSocketEnabled() && !!wsUrl
  });

  return { traces, activeSpans, isConnected, connectionStatus };
};

export default useWebSocket; 