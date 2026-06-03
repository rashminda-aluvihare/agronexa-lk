function notFoundHandler(_req, res) {
  return res.status(404).json({
    success: false,
    error: 'Not found',
  });
}

module.exports = { notFoundHandler };

