const socket = io();

const handle = document.getElementById('handle');
const message = document.getElementById('message');
const sendBtn = document.getElementById('send');
const output = document.getElementById('output');
const feedback = document.getElementById('feedback');
const chatWindow = document.getElementById('chat-window');
const matchaWindow = document.getElementById('matcha-chat');
const contactUser = document.getElementById('user');

sendBtn.addEventListener('click', () => {
    socket.emit('chat', {
        handle: handle.value,
        message: message.value
    });
});

feedback.addEventListener('keypress', () => {
    socket.emit('typing', {
        handle: handle.value
    })
});

contactUser.addEventListener('click', () => {
    socket.emit('chatRoom', )
});

socket.on('message', (data) => {
    output.innerHTML += `<p><strong>${data.handle}</strong> : ${data.message}</p>`;
    chatWindow.scrollTo(0, document.chatWindow.scrollHeight);
});

socket.on('check', (data) => {
    feedback.innerHTML = `<p><em>${data.handle} is typing a message...</em></p>`;
});