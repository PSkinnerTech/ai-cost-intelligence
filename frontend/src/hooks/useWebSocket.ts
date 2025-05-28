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
}

interface UseWebSocketReturn {
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  sendMessage: (message: any) => void;
  connect: () => void;
  disconnect: () => void;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
}

export const useWebSocket = (options: UseWebSocketOptions): UseWebSocketReturn => {
  const {
    url,
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    reconnectAttempts = 3,
    reconnectInterval = 5000
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  
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
        console.log('✅ WebSocket connected to:', url);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          memoizedOnMessage.current?.(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        setConnectionStatus('disconnected');
        isConnectingRef.current = false;
        memoizedOnDisconnect.current?.();
        console.log('🔌 WebSocket disconnected');

        if (reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current++;
          console.log(`🔄 Attempting to reconnect (${reconnectCountRef.current}/${reconnectAttempts}) in ${reconnectInterval}ms...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else {
          console.log('❌ Max reconnection attempts reached');
          setConnectionStatus('error');
        }
      };

      wsRef.current.onerror = (error) => {
        setConnectionStatus('error');
        isConnectingRef.current = false;
        memoizedOnError.current?.(error);
        
        // Only log errors after first attempt to reduce noise
        if (reconnectCountRef.current > 0) {
          console.error('❌ WebSocket error:', error);
        } else {
          console.log('🔗 Initial WebSocket connection failed, will retry...');
        }
      };

    } catch (error) {
      setConnectionStatus('error');
      isConnectingRef.current = false;
      console.error('❌ Failed to create WebSocket connection:', error);
    }
  }, [url, reconnectAttempts, reconnectInterval]);

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
    setConnectionStatus('disconnected');
    isConnectingRef.current = false;
    reconnectCountRef.current = 0;
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
      }
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message);
    }
  }, []);

  useEffect(() => {
    // Add a small delay to ensure backend is ready
    const connectTimeout = setTimeout(() => {
      connect();
    }, 1000);

    return () => {
      clearTimeout(connectTimeout);
      disconnect();
    };
  }, [connect, disconnect]);

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
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Assuming vercel dev proxies WebSocket to the root or a specific path if configured.
    // For now, let's try connecting to the root of the host serving the frontend.
    // If your WebSocket server is on a specific path like /api/websocket, adjust accordingly.
    return `${protocol}//${window.location.host}`;
  };

  const handleMessage = useCallback((message: WebSocketMessage) => {
    if (message.type === 'cost_update') {
      setCosts(prev => [...prev, message.data]);
      setTotalCost(prev => prev + (message.data.cost || 0));
    }
  }, []);

  const { isConnected, connectionStatus } = useWebSocket({
    url: getWebSocketURL(), // Dynamically set WebSocket URL
    onMessage: handleMessage
  });

  return { costs, totalCost, isConnected, connectionStatus };
};

export const useTestResults = () => {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [currentTest, setCurrentTest] = useState<any>(null);

  const getWebSocketURL = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  };

  const handleMessage = useCallback((message: WebSocketMessage) => {
    if (message.type === 'test_complete') {
      setTestResults(prev => [...prev, message.data]);
      setCurrentTest(null);
    }
  }, []);

  const { isConnected, connectionStatus, sendMessage } = useWebSocket({
    url: getWebSocketURL(), // Dynamically set WebSocket URL
    onMessage: handleMessage
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
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
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

  const { isConnected, connectionStatus } = useWebSocket({
    url: getWebSocketURL(), // Dynamically set WebSocket URL
    onMessage: handleMessage
  });

  return { traces, activeSpans, isConnected, connectionStatus };
};

export default useWebSocket; 