// Input validation and sanitization utilities

export function sanitizePlayerName(name) {
  if (!name || typeof name !== "string") {
    return "";
  }

  // Remove HTML tags and trim
  const sanitized = name
    .replace(/<[^>]*>/g, "")
    .trim()
    .substring(0, 20); // Max 20 characters

  return sanitized;
}

export function sanitizeChatMessage(message) {
  if (!message || typeof message !== "string") {
    return "";
  }

  // Remove HTML tags and trim
  const sanitized = message
    .replace(/<[^>]*>/g, "")
    .trim()
    .substring(0, 200); // Max 200 characters

  return sanitized;
}

export function validateRoomCode(roomCode) {
  if (!roomCode || typeof roomCode !== "string") {
    return false;
  }

  // Room code should be 4-8 alphanumeric characters
  const regex = /^[A-Z0-9]{4,8}$/;
  return regex.test(roomCode.toUpperCase());
}

export function validateDrawingData(data) {
  if (!data || typeof data !== "object") {
    return false;
  }

  const { x, y, prevX, prevY, color, lineWidth, type } = data;

  // Validate coordinates are within reasonable bounds
  const maxCoord = 10000;
  if (
    typeof x !== "number" ||
    x < 0 ||
    x > maxCoord ||
    typeof y !== "number" ||
    y < 0 ||
    y > maxCoord ||
    typeof prevX !== "number" ||
    prevX < 0 ||
    prevX > maxCoord ||
    typeof prevY !== "number" ||
    prevY < 0 ||
    prevY > maxCoord
  ) {
    return false;
  }

  // Validate color is a valid hex color
  const colorRegex = /^#[0-9A-F]{6}$/i;
  if (!colorRegex.test(color)) {
    return false;
  }

  // Validate line width
  if (typeof lineWidth !== "number" || lineWidth < 1 || lineWidth > 50) {
    return false;
  }

  // Validate type
  if (type !== "draw" && type !== "erase") {
    return false;
  }

  return true;
}

export function validateGameSettings(settings) {
  if (!settings || typeof settings !== "object") {
    return { drawTime: 80, maxRounds: 3 };
  }

  const drawTime =
    typeof settings.drawTime === "number" &&
    settings.drawTime >= 30 &&
    settings.drawTime <= 300
      ? settings.drawTime
      : 80;

  const maxRounds =
    typeof settings.maxRounds === "number" &&
    settings.maxRounds >= 1 &&
    settings.maxRounds <= 10
      ? settings.maxRounds
      : 3;

  return { drawTime, maxRounds };
}
