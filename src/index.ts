import Redis from "ioredis";
import WebSocket , {WebSocketServer} from "ws";
const channelSubscriptions  : Map<string , Set<WebSocket>> = new Map()
const redisClient = new Redis();
const wss  = new WebSocketServer({port : 8080});
redisClient.on("message" , (chan , message) => {
    if(channelSubscriptions.has(chan)){
        channelSubscriptions.get(chan)?.forEach((client) =>{
            if(client.readyState === WebSocket.OPEN){
                client.send(JSON.stringify({
                    channel : chan,
                    message : message
                }))
            }
        })
    }
})
wss.on('connection' , (ws  :WebSocket) => {
    console.log("connection established to the websocket server");
    ws.on('message' ,async(message : string) => {
        const data = JSON.parse(message);
        if(data.action === "subscribe" && typeof data.channel === "string"){
            const channel = data.channel
            if(!channelSubscriptions.has(channel)){
                channelSubscriptions.set(channel , new Set());
                await redisClient.subscribe(channel);
                console.log("client added to the set");
            }
            channelSubscriptions.get(channel)?.add(ws);
            
            console.log(`WebSocket subscribed to channel: ${channel}`);


        }else{
            ws.send(JSON.stringify({ error: 'Invalid action or channel name' }));
        }
    })
    ws.on("close" , () => {
        channelSubscriptions.forEach((subs , channel) => {
            subs.delete(ws);
            if(subs.size === 0){
                redisClient.unsubscribe(channel)
                channelSubscriptions.delete(channel)
                console.log(`Unsubscribed from Redis channel: ${channel}`);
            }
        })
    })
    ws.on("error" , (error) => {
        console.log(error)
    })


})
