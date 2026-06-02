export const getGreeting = () => {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good\nMorning";
  } else if (hour < 17) {
    return "Good\nAfternoon";
  } else if (hour < 21) {
    return "Good\nEvening";
  } else {
    return "Good\nNight";
  }
};
// Use 'as const' to tell TypeScript these are literal values, not just generic strings
export const timeOptions = {
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
  timeZone: 'Asia/Karachi'
} as const;

export const dateOptions = {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  timeZone: 'Asia/Karachi'
} as const;