import http from "http";
import express from "express";
import WebSocket from "ws";

const app = express();
const port = 3000;

let socketList = [];

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));

app.get("/", (req, res) => res.render("home"));
app.get("/*", (req, res) => res.redirect("/"));

const handlelisten = () => console.log(`Listing on http://localhost:${port}`);

const server = http.createServer(app);

const wss = new WebSocket.Server({ server });

server.listen(3000, handlelisten);

function jsonToString(type, payload) {
	return JSON.stringify({ type, payload });
}

wss.on("connection", (socket) => {
	socketList.push(socket);
	socket["nickname"] = "Anonymous";
	console.log("Connected to browser ✅");
	socket.on("message", (message) => {
		const msg = JSON.parse(message);
		switch (msg.type)
		{
			case "message":
				socketList.forEach(soc =>
					soc.send(jsonToString("message", `${socket.nickname}: ${msg.payload}`))
				);
				break;
			case "nickname":
				socketList.forEach(soc =>
					soc.send(jsonToString("notification", `"${socket.nickname}" change nickname to ${msg.payload}`))
				);
				socket["nickname"] = msg.payload;
				break;
		}
	});
	socket.on("close", (event) => {
		console.log(`Disconnected to browser ${event}`);
	});
});
