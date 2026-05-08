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