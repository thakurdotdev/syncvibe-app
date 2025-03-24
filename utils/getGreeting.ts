export function getGreeting() {
  const hour = new Date().getHours();

  if (hour >= 23 || hour < 5) {
    const lateNightMessages = [
      "Still awake? Poor life choices. 🌙",
      "Insomnia or regrets? Either way, vibe on. 🎧",
      "3 AM thoughts hitting hard, huh? 🔥",
      "Sleep is a myth. So is happiness. 💤",
      "Too late to fix your life, but not too late for music. 🎶",
    ];
    return lateNightMessages[
      Math.floor(Math.random() * lateNightMessages.length)
    ];
  }

  if (hour < 12) {
    const morningMessages = [
      "Morning! Time to fake productivity. ☀️",
      "Another day, another mistake waiting to happen. 😴",
      "Rise and regret. I mean… shine. ☕",
      "You survived the night. Barely. 🎉",
      "Sun’s up. Just like your stress levels. 📈",
    ];
    return morningMessages[Math.floor(Math.random() * morningMessages.length)];
  }

  if (hour < 18) {
    const afternoonMessages = [
      "Midday check-in: Still broke, still tired. 🔄",
      "That ‘afternoon slump’ is just life. 💀",
      "You call it working, I call it suffering. ⏳",
      "Your deadlines are laughing at you. 😂",
      "Productivity? Never heard of it. 🎵",
    ];
    return afternoonMessages[
      Math.floor(Math.random() * afternoonMessages.length)
    ];
  }

  if (hour < 21) {
    const eveningMessages = [
      "You survived another day. But at what cost? 🌇",
      "Dinner? More like eating your feelings. 🍕",
      "Sun’s down, motivation’s gone. 😵",
      "Almost bedtime. Almost. 😑",
      "Your patience is lower than your phone battery. 🔋",
    ];
    return eveningMessages[Math.floor(Math.random() * eveningMessages.length)];
  }

  const nightMessages = [
    "Dark outside, darker inside. 🎶",
    "Time to overthink every bad decision. 🌙",
    "Bedtime? Nah, let’s spiral instead. 🤡",
    "Sleep is calling. You keep declining. 📵",
    "Tomorrow’s a new day… to mess up again. 🔄",
  ];
  return nightMessages[Math.floor(Math.random() * nightMessages.length)];
}
