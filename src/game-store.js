import { readable } from 'svelte/store';

export default new readable(undefined, (set) => {
  const connection = new WebSocket('ws://localhost:2222');
  connection.onopen = function() {
    console.log('connected');
  };
  connection.onmessage = (event) => {
    set(JSON.parse(event.data));
  };
});
