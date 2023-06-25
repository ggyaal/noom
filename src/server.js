import http from "http";
import express from "express";
import socketIO from "socket.io";

const app = express();
const port = 3000;

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));

app.get("/", (_, res) => res.render("home"));
app.get("/*", (_, res) => res.redirect("/"));

const server = http.createServer(app);
const wsServer = socketIO(server);

function get_roomList() {
	const { rooms, sids } = wsServer.sockets.adapter;
	const roomList = [];
	rooms.forEach((_, roomName) => {
		if (sids.get(roomName) === undefined)
			roomList.push(roomName);
	});
	return roomList;
}

function how_many_inroom(roomName) {
	const { rooms } = wsServer.sockets.adapter;
	const peopleList = rooms.get(roomName);
	return peopleList.size;
}

function autoReflashRoomList(type, socket, roomName) {
	if (type === "join")
	{
		const roomList = get_roomList();
		if (roomList.filter(room => room === roomName).length === 0)
		{
			socket.join(roomName);
			socket.broadcast.emit("reflashRoomList");
		}
		else
		{
			if (how_many_inroom(roomName) < 2)
				socket.join(roomName);
			else
				return false;
		}
	}
	else if (type === "leave")
	{
		const { rooms } = wsServer.sockets.adapter;
		socket.leave(roomName);
		if (rooms.get(roomName) === undefined)
			socket.broadcast.emit("reflashRoomList");
	}
	return true;
}

function exit_allRoom(socket) {
	socket.rooms.forEach(room => {
		if (socket.id !== room)
		{
			socket.to(room).emit("leave_user", socket.nick);
			autoReflashRoomList("leave", socket, room);
		}
	});
}

function am_i_in_room(socket) {
	for (var room of socket.rooms) {
		if (socket.id !== room)
			return room;
	}
	return undefined;
}

function valid_nickname(nickName) {
	const ws_sockets = wsServer.sockets.adapter.nsp.sockets;
	for (var ws_socket of ws_sockets.values()) {
		if (ws_socket.nick === nickName)
			return false;
	}
	return true;
}

wsServer.on("connection", (socket) => {
	socket.on("set_nick", (nick, done) => {
		let isDone = valid_nickname(nick);
		if (isDone)
			socket["nick"] = nick;
		done(isDone, nick);
	});
	socket.on("get_nick", (done) => {
		done(socket.nick);
	});
	socket.on("change_nick", (nick, done) => {
		const old_nick = socket.nick;
		let isDone = valid_nickname(nick);
		if (isDone)
		{
			socket["nick"] = nick;
			socket.to(am_i_in_room(socket)).emit("change_nick", old_nick, nick);
		}
		done(isDone, old_nick, nick);
	})
	socket.on("disconnecting", () => {
		const roomName = am_i_in_room(socket);
		if (roomName !== undefined)
			socket.to(roomName).emit("leave_user", socket.nick);
	});
	socket.on("disconnect", () => {
		socket.broadcast.emit("reflashRoomList");
	});
	socket.on("enter_room", (room, done) => {
		if (am_i_in_room(socket) !== room)
		{
			exit_allRoom(socket);
			const status = autoReflashRoomList("join", socket, room);
			if (status)
				socket.to(room).emit("welcome", socket.nick);
			done(room, status);
		}
	});
	socket.on("leave_room", (done) => {
		const room = am_i_in_room(socket);
		if (room !== undefined)
		{
			exit_allRoom(socket);
			done();
		}
	});
	socket.on("roomList", (done) => {
		const roomList = get_roomList();
		done(roomList);
	});
	socket.on("message", (message, done) => {
		const roomName = am_i_in_room(socket);
		if (roomName !== undefined)
			socket.to(roomName).emit("message", socket.nick, message);
		done(message);
	});
	socket.on("offer", offer => {
		const currRoom = am_i_in_room(socket);
		if (currRoom !== undefined)
			socket.to(currRoom).emit("offer", offer);
	});
	socket.on("answer", answer => {
		const currRoom = am_i_in_room(socket);
		if (currRoom !== undefined)
			socket.to(currRoom).emit("answer", answer);
	});
	socket.on("ice", ice => {
		const currRoom = am_i_in_room(socket);
		if (currRoom !== undefined)
			socket.to(currRoom).emit("ice", ice);
	});
  });

const handlelisten = () => console.log(`Listing on http://localhost:${port}`);
server.listen(3000, handlelisten);
