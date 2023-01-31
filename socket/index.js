import { Server } from 'socket.io';
//import { initListener } from './initSocket';
//io.on('connection', initListener);
const io = new Server(process.env.SOCKET_PORT, {
  cors: { origin: process.env.CLIENT_HOST.slice(0, -1) },
});
let onlineUsers = [];

// io.of('/chat').on
io.on('connection', (socket) => {
  // When user logs in
  socket.on('add-user', (_id) => {
    // onlineUsers = []
    // Push user if not added previously
    if (!onlineUsers.find((u) => u._id === _id))
      onlineUsers.push({ _id, socket: socket.id });

    // Send all online users
    io.emit('get-users', onlineUsers);
  });

  // When page is refreshed
  socket.on('disconnect', () => {
    // Remove user from online users
    onlineUsers = onlineUsers.filter((u) => u.socket !== socket.id);

    // Send all online users
    io.emit('get-users', onlineUsers);
  });

  // When user logs out
  socket.on('logout', () => {
    // Remove user from online users
    onlineUsers = onlineUsers.filter((u) => u.socket !== socket.id);

    // Send all online users
    io.emit('get-users', onlineUsers);
  });

  // Send message to a specific user
  socket.on('send-message', (data) => {
    const { receivers } = data;
    // const users = receivers.map(r => onlineUsers.find(u => u._id === r._id))
    // console.log('Sending data from socket to:', receivers.map(r => r._id), data)

    for (const receiver of receivers) {
      const user = onlineUsers.find((u) => u._id === receiver._id);
      console.log('Sending data from socket to:', receiver._id, data);

      if (user) io.to(user.socket).emit('receive-message', data);
    }
  });
});
