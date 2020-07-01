const socket = io();

const handle = document.getElementById('handle');
const message = document.getElementById('message');
const sendBtn = document.getElementById('send');
const output = document.getElementById('output');
const feedback = document.getElementById('feedback');
const chatWindow = document.getElementById('chat-window');
const matchaWindow = document.getElementById('matcha-chat');

//Get username from URL
const {username, room} = Qs.parse(location.search, {
    ignoreQueryPrefix: true
});

// console.log(username, room);

//Join chat room
socket.emit('joinRoom', {
    username,
    room
})

sendBtn.addEventListener('click', () => {
    socket.emit('chat', {
        handle: handle.value,
        message: message.value
    });
    message.value = "";
    message.focus();
});




feedback.addEventListener('keypress', () => {
    socket.emit('typing', {
        handle: handle.value
    })
});

// contactUser.addEventListener('click', () => {
//     socket.emit('chatRoom', )
// });

socket.on('message', (data) => {
    // output.innerHTML += `<p><strong>${data.handle}</strong> : ${data.message}</p>`;
    daoutput(data);
    chatWindow.scrollTop = chatWindow.scrollHeight;
});

function daoutput(data) {
    output.innerHTML += `<p><strong>${data.username}</strong> <em>${data.time}</em>: ${data.message}</p>`;
}

socket.on('check', (data) => {
    feedback.innerHTML = `<p><em>${data.handle} is typing a message...</em></p>`;
});