let ioInstance = null;

function attachSocket(io) {
  ioInstance = io;

  io.on('connection', (socket) => {
    socket.on('join', (userId) => {
      if (userId) {
        socket.join(`user_${userId}`);
        console.log(`📡 User ${userId} joined room user_${userId}`);
      }
    });

    socket.on('disconnect', () => {
      // Clean up if needed
    });
  });
}

function getIo() {
  return ioInstance;
}

module.exports = {
  attachSocket,
  getIo,
};
