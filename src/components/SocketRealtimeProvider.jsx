import { createContext, useContext, useEffect, useRef, useState } from "react";
import socket from "../socket-io";

const SocketRealtimeContext = createContext(null);

export function SocketRealtimeProvider({ children }) {
  const reconnectListeners = useRef(new Set());
  const subscribedChannels = useRef(new Map());
  const [status, setStatus] = useState(socket.connected ? "connected" : "disconnected");

  useEffect(() => {
    const onConnect = () => {
      setStatus("connected");

      // A Socket.IO reconnect creates a new server-side connection, so room
      // memberships must be joined again. Keep the original subscriptions
      // active without requiring any page/component to remount.
      for (const channel of subscribedChannels.current.keys()) {
        socket.emit("joinOSCEChannel", { channel });
      }

      reconnectListeners.current.forEach((cb) => {
        try {
          cb();
        } catch {}
      });
    };
    const onDisconnect = () => setStatus("disconnected");
    const onConnectError = () => setStatus("disconnected");

    setStatus("connecting");
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    if (!socket.connected) socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
    };
  }, []);

  const api = useRef({
    subscribe(channel, handler) {
      const count = subscribedChannels.current.get(channel) || 0;
      subscribedChannels.current.set(channel, count + 1);
      if (count === 0 && socket.connected) {
        socket.emit("joinOSCEChannel", { channel });
      }

      socket.on(channel, handler);

      return () => {
        socket.off(channel, handler);
        const next = (subscribedChannels.current.get(channel) || 1) - 1;
        if (next <= 0) {
          subscribedChannels.current.delete(channel);
        } else {
          subscribedChannels.current.set(channel, next);
        }
      };
    },
    onReconnect(handler) {
      reconnectListeners.current.add(handler);
      return () => reconnectListeners.current.delete(handler);
    },
    getStatus() {
      return socket.connected ? "connected" : status;
    },
  });

  api.current.getStatus = () => (socket.connected ? "connected" : status);

  return (
    <SocketRealtimeContext.Provider value={api.current}>
      {children}
    </SocketRealtimeContext.Provider>
  );
}

export function useRealtimeClient() {
  const client = useContext(SocketRealtimeContext);
  if (!client) {
    throw new Error("useRealtimeClient must be used within <SocketRealtimeProvider>");
  }
  return client;
}

export function useRealtimeChannel(channel, onMessage) {
  const client = useRealtimeClient();
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    if (!channel) return undefined;
    return client.subscribe(channel, (data) => handlerRef.current(data));
  }, [client, channel]);
}

export function useRealtimeReconnect(onReconnect) {
  const client = useRealtimeClient();
  const cbRef = useRef(onReconnect);
  cbRef.current = onReconnect;
  useEffect(() => client.onReconnect(() => cbRef.current()), [client]);
}

export function useRealtimeConnectionStatus() {
  const client = useRealtimeClient();
  const [state, setState] = useState(client.getStatus());

  useEffect(() => {
    const update = () => setState(client.getStatus());
    socket.on("connect", update);
    socket.on("disconnect", update);
    socket.on("connect_error", update);
    return () => {
      socket.off("connect", update);
      socket.off("disconnect", update);
      socket.off("connect_error", update);
    };
  }, [client]);

  return state;
}
