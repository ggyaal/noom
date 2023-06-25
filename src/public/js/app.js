const socket = io();
const nick = document.getElementById("nick");
const message = document.getElementById("message");
const video_main = document.getElementById("video-main");
const chatting = document.getElementById("chatting");
const roomList = document.getElementById("roomList");
const createRoom = document.getElementById("createRoom");
const reflashRoom = document.getElementById("reflashRoom");
const roomNameDiv = document.querySelector(".roomName");

video_main.style.display = "none";
chatting.style.display = "none";
roomList.style.display = "none";

function alert_welcome(msg, form) {
	const div = document.getElementById("welcome");
	const btn = form?.querySelector("button");
	if (btn !== undefined)
		btn.disabled = true;
	div.innerText = msg;
	div.classList.add("emphasize");
	setTimeout(() => {
		div.classList.remove("emphasize");
		setTimeout(() => {
			socket.emit("get_nick", (nick) => {
				if (nick === undefined || nick === null)
					div.innerText = "🐚";
				else
					div.innerText = `hi, ${nick}!`;
			});
			if (btn !== undefined)
				btn.disabled = false;
		}, 800);
	}, 500);
}

function msg_scrolling() {
	const ul = chatting.querySelector("ul");
	ul.scrollTop = ul.scrollHeight;
}

function enterRoomHandler(roomName, status) {
	if (status) {
		const ul = chatting.querySelector("ul");
		ul.innerHTML = "";
		roomNameDiv.innerText = `Room <${roomName}>`;
		video.srcObject = undefined;
		chatting.style.display = "";
		video_main.style.display = "";
		message.style.display = "";
		socket["room"] = roomName;
		const leaveBtn = document.getElementById("reaveBtn");
		leaveBtn.addEventListener("click", (event) => {
			event.preventDefault();
			socket.emit("leave_room", () => {
				chatting.style.display = "none";
				video_main.style.display = "none";
				socket.room = undefined;
				reflashRoomList();
			});
		});
		reflashRoomList();
	}
	else {
		alert_welcome("This room is full");
	}
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
		if (roomLink.innerText !== socket.room) {
			roomLink.classList.add("linking");
			roomLink.addEventListener("click", async (event) => {
				event.preventDefault();
				await startMedia();
				socket.emit("enter_room", roomLink.innerText, enterRoomHandler);
			});
		}
	});
  });
}

socket.on("welcome", async nick => {
	const ul = chatting.querySelector("ul");
	const li = document.createElement("li");
	li.className = "noti";
	li.innerText = `Welcome to this room ${nick} !`;
	ul.append(li);
	msg_scrolling();
	await startMedia();
	await send_offer(socket);
});

socket.on("leave_user", nick => {
	const ul = chatting.querySelector("ul");
	const li = document.createElement("li");
	li.className = "noti";
	li.innerText = `${nick} leave this room.`;
	ul.append(li);
	msg_scrolling();
	if (peerConnection) {
		const senders = peerConnection.getSenders();
		senders.forEach(sender => peerConnection.removeTrack(sender));
	}
	if (peerDataChannel) {
		peerDataChannel.close();
	}
	video.srcObject = undefined;
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

socket.on("offer", async offer => {
	peerConnection.addEventListener("datachannel", event => {
		peerDataChannel = event.channel;
		peerDataChannel.addEventListener("message", sendLetter);
	});
	peerConnection.setRemoteDescription(offer);
	const answer = await peerConnection.createAnswer();
	peerConnection.setLocalDescription(answer);
	socket.emit("answer", answer);
});

socket.on("answer", answer => {
	peerConnection.setRemoteDescription(answer);
});

socket.on("ice", ice => {
	peerConnection.addIceCandidate(ice);
});

nick.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = nick.querySelector("input");
  socket.emit("set_nick", input.value, (isDone, nickName) => {
    const div = document.getElementById("welcome");
	if (isDone) {
		div.innerText = `hi, ${nickName}!`;
		nick.style.display = "none";
		roomList.style.display = "";
		const nickChange = document.getElementById("nickChange");
		nickChange.addEventListener("submit", event => {
			event.preventDefault();
			const input = event.target.querySelector("input");
			socket.emit("change_nick", input.value, (idDone, old_nick, new_nick) => {
				if (idDone) {
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
			});
		});
		reflashRoomList();
		input.value = "";
	}
	else
		alert_welcome("nickname is duplicated ❌", event.target);
  });
});

createRoom.addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = createRoom.querySelector("input");
  await startMedia();
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

// video

const video = document.getElementById("video");
const myVideo = document.getElementById("myVideo");
const onoffBtn = document.getElementById("video-on");
const muteBtn = document.getElementById("mute");
const myVideos = document.getElementById("my-videos");
const myAudios = document.getElementById("my-audios");

let myStream;
let videoOn = true;
let audioMute = false;
let currVideo = undefined;
let currAudio = undefined;

let peerConnection;
let peerDataChannel;

async function getInputDevices() {
	try {
		const devices = await navigator.mediaDevices.enumerateDevices();
		const cams = devices.filter(device => device.kind === "videoinput");
		const mics = devices.filter(device => device.kind === "audioinput");
		cams.forEach(cam => {
			const optionTag = document.createElement("option");
			optionTag.value = cam.deviceId;
			optionTag.innerText = cam.label;
			myVideos.append(optionTag);
		})
		mics.forEach(mic => {
			const optionTag = document.createElement("option");
			optionTag.value = mic.deviceId;
			optionTag.innerText = mic.label;
			myAudios.append(optionTag);
		})
	} catch (e) { console.log(e); }
}

async function getMedia() {
	try {
		myStream = await navigator.mediaDevices.getUserMedia({
			audio: currAudio? { deviceId: { exact: currAudio } } : true,
			video: currVideo? { deviceId: { exact: currVideo } } : { facingMode: "user" }
		});
		myVideo.srcObject = myStream;
		if (currVideo === undefined && currAudio === undefined)
			getInputDevices();
	} catch (e) { console.log (e); }
}

async function startMedia() {
	if (myStream === undefined || myStream.getTracks().length === 0)
		await getMedia();
	makePeerConnection();
}

onoffBtn.addEventListener("click", () => {
	videoOn = !videoOn;
	if (videoOn) {
		onoffBtn.classList.add("actived");
		onoffBtn.innerText = "Video On";
	}
	else {
		onoffBtn.classList.remove("actived");
		onoffBtn.innerText = "Video Off";
	}
	myStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
});

muteBtn.addEventListener("click", () => {
	audioMute = !audioMute;
	if (audioMute) {
		muteBtn.classList.add("actived");
		muteBtn.innerText = "Mute";
	}
	else {
		muteBtn.classList.remove("actived");
		muteBtn.innerText = "Unmute";
	}
	myStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
});

myVideos.addEventListener("input", async () => {
	currVideo = myVideos.value;
	await getMedia();
	if (peerConnection) {
		const videoTrack = myStream.getVideoTracks()[0];
		const videoSender = peerConnection.getSenders().find(sender => sender.track.kind === "video");
		videoSender.replaceTrack(videoTrack);
	}
});

myAudios.addEventListener("input", async () => {
	currAudio = myAudios.value;
	await getMedia();
	if (peerConnection) {
		const audioTrack = myStream.getAudioTracks()[0];
		const videoSender = peerConnection.getSenders().find(sender => sender.track.kind === "audio");
		videoSender.replaceTrack(audioTrack);
	}
});

// webRTC connection

function makePeerConnection() {
	peerConnection = new RTCPeerConnection();
	peerConnection.addEventListener("icecandidate", (ice) => {
		socket.emit("ice", ice.candidate);
	});
	peerConnection.addEventListener("track", (data) => {
		video.srcObject = data.streams[0];
	});
	myStream.getTracks().forEach(track => peerConnection.addTrack(track, myStream));
}

async function send_offer() {
	peerDataChannel = peerConnection.createDataChannel("letter");
	peerDataChannel.addEventListener("message", sendLetter);
	const offer = await peerConnection.createOffer();
	peerConnection.setLocalDescription(offer);
	socket.emit("offer", offer);
}

// data channel
const letter = document.getElementById("letter");
const pannel = document.getElementById("pannel");

pannel.querySelectorAll("li").forEach(li => li.addEventListener("click", event => {
	event.preventDefault();
	peerDataChannel.send(event.target.innerText);
}));


function sendLetter(event) {
	const preDiv = letter.querySelector("div");
	const div = document.createElement("div");
	div.innerText = event.data;
	div.classList.add("letter-event");
	if (!(preDiv === undefined || preDiv === null))
		preDiv.remove();
	letter.append(div);
}
