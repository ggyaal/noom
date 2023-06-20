const messageList = document.querySelector("ul");
const nickForm = document.querySelector("#nickname");
const messageForm = document.querySelector("#message");
const socket = new WebSocket(`ws://${window.location.host}`);

function makeJsonData(type, payload) {
	return JSON.stringify({type, payload});
}

function nickHandler(event) {
	event.preventDefault();
	const input = nickForm.querySelector("input");
	socket.send(makeJsonData("nickname", input.value));
	input.value = "";
}

function messageHandler(event) {
	event.preventDefault();
	const input = messageForm.querySelector("input");
	socket.send(makeJsonData("message", input.value));
	input.value = "";
}

socket.addEventListener("open", () => {
	const li = document.createElement("li");
	li.className = "notification";
	li.innerText = "Connected on Server 🚀";
	messageList.append(li);
});

socket.addEventListener("message", (message) => {
	const msg = JSON.parse(message.data);
	const li = document.createElement("li");
	li.className = msg.type;
	li.innerText = msg.payload;
	messageList.append(li);
})

socket.addEventListener("close", () => {
	const li = document.createElement("li");
	li.className = "notification";
	li.innerText = "Disconnected on Server 🚧";
	messageList.append(li);
});

nickForm.addEventListener("submit", nickHandler);
messageForm.addEventListener("submit", messageHandler);
