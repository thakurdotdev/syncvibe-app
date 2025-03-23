export function getGreeting() {
  const hour = new Date().getHours();

  if (hour >= 23 || hour < 5) {
    const lateNightMessages = [
      "What's up night owl 🦉",
      "Still vibing? Same bestie 🌃",
      "Late night bops only 🌙",
      "Sleep is overrated anyway 💤",
      "Midnight music marathon 🎧",
      "Shh... everyone else is sleeping 🤫",
    ];
    return lateNightMessages[
      Math.floor(Math.random() * lateNightMessages.length)
    ];
  }

  if (hour < 12) {
    const morningMessages = [
      "Rise & shine bestie ☀️",
      "Morning mood activated ✨",
      "Breakfast bops ready 🍳",
      "Too early? Blame the playlist 🎵",
      "Coffee + Music = Morning solved ☕",
      "Hitting snooze on responsibilities 🛌",
    ];
    return morningMessages[Math.floor(Math.random() * morningMessages.length)];
  }

  if (hour < 18) {
    const afternoonMessages = [
      "Afternoon vibes ✌️",
      "Midday slay underway 💅",
      "Lunch break beats 🥪",
      "Productivity playlist loading... ⏳",
      "Afternoon slump? We've got the cure 💊",
      "Meeting escape soundtrack ready 🏃‍♂️",
    ];
    return afternoonMessages[
      Math.floor(Math.random() * afternoonMessages.length)
    ];
  }

  if (hour < 21) {
    const eveningMessages = [
      "Evening flex 💯",
      "Dinner time playlist? 🍝",
      "Sunset sounds loading... 🌆",
      "Commute tunes unlocked 🚗",
      "Evening energy boost incoming 🔋",
      "Cooking with the perfect soundtrack 👨‍🍳",
    ];
    return eveningMessages[Math.floor(Math.random() * eveningMessages.length)];
  }

  const nightMessages = [
    "Late night mood 🌙",
    "Time to unwind fr fr 😌",
    "Cozy night playlist era 🕯️",
    "Netflix and chill soundtrack? 📺",
    "Pajamas + music = perfect night 🧸",
    "Stars out, volume up 🌠",
  ];
  return nightMessages[Math.floor(Math.random() * nightMessages.length)];
}
