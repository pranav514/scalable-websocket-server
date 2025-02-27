import WebSocket , {WebSocketServer} from "ws";
import Redis from "ioredis"
const client = new Redis();
const send_ticker  = () => {
     setInterval(() => {
          const random = Math.random().toString();
           console.log(random);
           client.publish("test" , random)
           console.log("send")
    } , 5000);

}

send_ticker();