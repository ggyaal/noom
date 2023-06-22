const socket = io();
const nick = document.getElementById("nick");
const message = document.getElementById("message");
const chatting = document.getElementById("chatting");
const roomList = document.getElementById("roomList");
const createRoom = document.getElementById("createRoom");
const reflashRoom = document.getElementById("reflashRoom");
const roomNameDiv = document.querySelector(".roomName");

chatting.style.display = "none";
roomList.style.display = "none";

function alert_welcome(msg, form) {
	const div = document.getElementById("welcome");
	const btn = form.querySelector("button");
	console.log(btn);
	btn.disabled = true;
	div.innerText = msg;
	div.classList.add("emphasize");
	setTimeout(() => {
		div.classList.remove("emphasize");
		setTimeout(() => {
			socket.emit("get_nick", (nick) => {
				div.innerText = `hi, ${nick}!`;
			});
			btn.disabled = false;
		}, 800);
	}, 500);
}

function msg_scrolling() {
	const ul = chatting.querySelector("ul");
	ul.scrollTop = ul.scrollHeight;
}

function enterRoomHandler(roomName) {
	const ul = chatting.querySelector("ul");
	ul.innerHTML = "";
	roomNameDiv.innerText = `Room <${roomName}>`;
	chatting.style.display = "";
	message.style.display = "";
	socket["room"] = roomName;
	const leaveBtn = document.getElementById("reaveBtn");
	leaveBtn.addEventListener("click", (event) => {
		event.preventDefault();
		socket.emit("leave_room", () => {
			chatting.style.display = "none";
			socket.room = undefined;
			reflashRoomList();
		});
	});
	reflashRoomList();
}

function reflashRoomList() {
	socket.emit("roomList", (rooms) => {
		const ul = roomList.querySelector("ul");
		ul.innerHTML = "";
		rooms.forEach((room) => {
			const li = document.createElement("li");
			li.className = "roomLink";
			li.innerText = room;
			ul.append(li);
			msg_scrolling();
		});
	const roomLinks = document.querySelectorAll(".roomLink");
	roomLinks.forEach(roomLink => {
		if (roomLink.innerText !== socket.room)
		{
			roomLink.classList.add("linking");
			roomLink.addEventListener("click", (event) => {
				event.preventDefault();
				socket.emit("enter_room", roomLink.innerText, enterRoomHandler);
			});
		}
	});
  });
}

socket.on("welcome", nick => {
	const ul = chatting.querySelector("ul");
	const li = document.createElement("li");
	li.className = "noti";
	li.innerText = `Welcome to this room ${nick} !`;
	ul.append(li);
	msg_scrolling();
});

socket.on("leave_user", nick => {
	const ul = chatting.querySelector("ul");
	const li = document.createElement("li");
	li.className = "noti";
	li.innerText = `${nick} leave this room.`;
	ul.append(li);
	msg_scrolling();
});

socket.on("message", (nick, message) => {
	const ul = chatting.querySelector("ul");
	const li = document.createElement("li");
	const name = document.createElement("div");
	const msg = document.createElement("div");
	name.className = "your_nick";
	name.innerText = nick;
	msg.className = "message your_message";
	msg.innerText = message;
	li.className = "your_message_block"
	li.append(name, msg);
	ul.append(li);
	msg_scrolling();
});

socket.on("change_nick", (old_nick, new_nick) => {
	const ul = chatting.querySelector("ul");
	const li = document.createElement("li");
	li.className = "noti";
	li.innerText = `change nickname [ ${old_nick} => ${new_nick} ]`;
	ul.append(li);
	msg_scrolling();
});

socket.on("reflashRoomList", reflashRoomList);

nick.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = nick.querySelector("input");
  socket.emit("set_nick", input.value, (isDone, nickName) => {
    const div = document.getElementById("welcome");
	if (isDone)
	{
		div.innerText = `hi, ${nickName}!`;
		nick.style.display = "none";
		roomList.style.display = "";
		const nickChange = document.getElementById("nickChange");
		nickChange.addEventListener("submit", event => {
			event.preventDefault();
			const input = event.target.querySelector("input");
			socket.emit("change_nick", input.value, (idDone, old_nick, new_nick) => {
				if (idDone)
				{
					const ul = chatting.querySelector("ul");
					const li = document.createElement("li");
					li.className = "noti";
					li.innerText = `change nickname [ ${old_nick} => ${new_nick} ]`;
					ul.append(li);
					msg_scrolling();
					div.innerText = `hi, ${new_nick}!`;
					input.value = "";
				}
				else
					alert_welcome("nickname is duplicated ❌", event.target);
			})
		})
		reflashRoomList();
		input.value = "";
	}
	else
		alert_welcome("nickname is duplicated ❌", event.target);
  });
});

createRoom.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = createRoom.querySelector("input");
  socket.emit("enter_room", input.value, enterRoomHandler);
  input.value = "";
});

message.addEventListener("submit", (event) => {
	event.preventDefault();
	const input = message.querySelector("input");
	socket.emit("message", input.value, (message) => {
		const ul = chatting.querySelector("ul");
		const li = document.createElement("li");
		li.className = "message me_message";
		li.innerText = message;
		ul.append(li);
		msg_scrolling();
	});
	input.value = "";
});
