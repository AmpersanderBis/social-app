export const notifListener = (socket) => {
    socket.on('joinUid', (data) => {
        socket.broadcast.join(data.uid);
        console.log(`user join channel: ${data.uid}`)
    });
    socket.on('leaveUid', (data) => {
        socket.broadcast.leave(data.uid);
        console.log(`user leave channel: ${data.uid}`)
    });
    socket.on('message',  (data) => {
        socket.broadcast.to(data.uid).emit('message', { message: data.message})
    })
}