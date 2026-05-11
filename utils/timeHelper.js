const toNepalTime = (date) => {
  if (!date) return null;

  return new Date(date).toLocaleString("en-NP", {
    timeZone: "Asia/Kathmandu",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

module.exports = { toNepalTime };
