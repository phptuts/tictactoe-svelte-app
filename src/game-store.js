import { readable } from 'svelte/store';
let connection;

let timer;
let message;

const connect = () => {
  try {
    if (!connection || connection.readyState >= 2) {
      connection = new WebSocket(process.env.webSocketUrlLocal);

      connection.onclose = (e) => {
        console.log(e, 'closed');
        timer = setInterval(() => {
          connect();
        }, 500);
      };

      connection.onopen = function() {
        clearInterval(timer);
        console.log('connected');
      };

      connection.onmessage = (e) => {
        message = e.data;
      };
    }
  } catch (e) {
    console.log(e, 'error logging');
  }
};

connect();

const store = new readable(undefined, (set) => {
  setInterval(() => {
    if (message) {
      set(JSON.parse(message));
      message = undefined;
    }
  }, 20);
});

export default {
  subscribe: store.subscribe,
  isConnected: () => connection.readyState <= 1,
  connect
};
