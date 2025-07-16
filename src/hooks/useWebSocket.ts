import { useEffect, useRef, useState, useCallback } from 'react';
import { getWebSocketUrl, resetApiPortCache } from '@/utils/apiConfig';

interface WebSocketOptions {
  onMessage?: (data: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export function useWebSocket(options: WebSocketOptions = {}) {
  const {
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    reconnectInterval = 5000,
    maxReconnectAttempts = 10
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isManualClose = useRef(false);
  const lastPortRef = useRef<number | null>(null);

  const clearReconnectTimeout = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  const connect = useCallback(async () => {
    // Prevent multiple simultaneous connections
    if (wsRef.current?.readyState === WebSocket.CONNECTING ||
        wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Clear any existing reconnect timeout
    clearReconnectTimeout();

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.onclose = null; // Prevent triggering reconnect
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      // Get WebSocket URL dynamically
      const wsUrl = await getWebSocketUrl();
      
      // Extract port from URL for comparison
      const urlMatch = wsUrl.match(/:(\d+)/);
      const currentPort = urlMatch ? parseInt(urlMatch[1]) : null;
      
      // If port changed, reset API cache
      if (lastPortRef.current && currentPort && lastPortRef.current !== currentPort) {
        console.log(`🔄 Port changed from ${lastPortRef.current} to ${currentPort}, resetting cache`);
        resetApiPortCache();
      }
      
      lastPortRef.current = currentPort;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('🔌 WebSocket connected');
        setIsConnected(true);
        setReconnectAttempts(0);
        clearReconnectTimeout();
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage?.(data);
        } catch (error) {
          console.warn('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected');
        setIsConnected(false);
        wsRef.current = null;
        onDisconnect?.();

        // Only reconnect if not manually closed and under max attempts
        if (!isManualClose.current && reconnectAttempts < maxReconnectAttempts) {
          const delay = Math.min(reconnectInterval * Math.pow(1.5, reconnectAttempts), 30000);
          console.log(`⏳ Will reconnect in ${delay / 1000} seconds... (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        onError?.(error);
        
        // On error, trigger reconnect through close handler
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      };

    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setIsConnected(false);
      
      // Schedule reconnect on connection failure
      if (!isManualClose.current && reconnectAttempts < maxReconnectAttempts) {
        const delay = Math.min(reconnectInterval * Math.pow(1.5, reconnectAttempts), 30000);
        reconnectTimeoutRef.current = setTimeout(() => {
          setReconnectAttempts(prev => prev + 1);
          connect();
        }, delay);
      }
    }
  }, [onMessage, onConnect, onDisconnect, onError, reconnectInterval, maxReconnectAttempts, reconnectAttempts]);

  const disconnect = useCallback(() => {
    isManualClose.current = true;
    clearReconnectTimeout();
    
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setReconnectAttempts(0);
  }, []);

  const sendMessage = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
      return true;
    }
    return false;
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    isManualClose.current = false;
    connect();

    // Cleanup on unmount
    return () => {
      isManualClose.current = true;
      clearReconnectTimeout();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []); // Only run on mount/unmount

  // Monitor for port changes by checking periodically
  useEffect(() => {
    const checkPortChange = async () => {
      if (!isConnected || !wsRef.current) return;

      try {
        const wsUrl = await getWebSocketUrl();
        const urlMatch = wsUrl.match(/:(\d+)/);
        const currentPort = urlMatch ? parseInt(urlMatch[1]) : null;

        if (lastPortRef.current && currentPort && lastPortRef.current !== currentPort) {
          console.log(`🔄 Detected port change from ${lastPortRef.current} to ${currentPort}, reconnecting...`);
          // Force reconnect with new port
          isManualClose.current = false;
          disconnect();
          setTimeout(() => {
            isManualClose.current = false;
            connect();
          }, 100);
        }
      } catch (error) {
        // Ignore errors in port checking
      }
    };

    const interval = setInterval(checkPortChange, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [isConnected, connect, disconnect]);

  return {
    isConnected,
    connect,
    disconnect,
    sendMessage,
    reconnectAttempts
  };
}