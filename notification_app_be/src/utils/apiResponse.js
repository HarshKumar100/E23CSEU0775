function ok(data) {
  return { success: true, data };
}

function fail(error) {
  return { success: false, error };
}

module.exports = { ok, fail };
