import WebSocket , {WebSocketServer} from "ws";
import Redis from "ioredis"

const redisClients : Map<string , Redis> = new Map(); // new redisClient for the new channel
const channelSubscriptions : Map<string , Set<WebSocket>> = new Map(); // for the particular channel the total number of websocket connection

const wss = new WebSocketServer({port : 8080});
console.log("websocket server listining on post 8080")
wss.on("connection" , (ws : WebSocket) => {
    console.log("connection established to the websocket server")

    ws.on("message" , async(message : string) => {
        try{
            const data = JSON.parse(message);
            if(data.action === "subscribe" && typeof data.channel === "string"){
                const channel = data.channel;
                if(!redisClients.has(channel)){
                    const redisClient = new Redis();
                    redisClients.set(channel , redisClient);
                    try{
                        await redisClient.subscribe(channel);
                        console.log(`Subscribed to Redis channel: ${channel}`);
                    }catch(error){
                        console.error(`Failed to subscribe to Redis channel ${channel}:`, error);
                           ws.send(JSON.stringify({ error: `Failed to subscribe to channel ${channel}` }));
                           return 
                    }
                    redisClient.on("message" , (chan , message) => {
                        if(channelSubscriptions.has(chan)){
                            channelSubscriptions.get(chan)?.forEach((client) => {
                                if(client.readyState === WebSocket.OPEN){
                                    client.send(JSON.stringify({ // websocket will send the request to the client
                                        channel : chan,
                                        message : message
                                    }))
                                }
                            })
                        }
                    })
                }
                if(!channelSubscriptions.has(channel)){
                    channelSubscriptions.set(channel , new Set());
                }
                channelSubscriptions.get(channel)?.add(ws);
                console.log(`WebSocket subscribed to channel: ${channel}`);
            }else{
                ws.send(JSON.stringify({ error: 'Invalid action or channel name' }));
            }
        }catch(error){
            console.log(error);
        }
    })
    ws.on("close" , () => {
        channelSubscriptions.forEach((subscribers , channel) => {
            subscribers.delete(ws);

            if(subscribers.size  === 0){
                redisClients.get(channel)?.quit();
                redisClients.delete(channel)
                channelSubscriptions.delete(channel);
            }
        })
    })
    ws.on('error', (err) => {
       console.error('WebSocket error:', err);
   });
})