const IMAGE_PATHS = [
  // Game icons
  '/game-icons/Active games.png',
  '/game-icons/Boardgames.png',
  '/game-icons/Card games.png',
  '/game-icons/Competative games.png',
  '/game-icons/Coop games.png',
  '/game-icons/Drawing & Creative.png',
  '/game-icons/Mobile games.png',
  '/game-icons/Party games.png',
  '/game-icons/Puzzles.png',
  '/game-icons/Role play.png',
  '/game-icons/Strategy.png',
  '/game-icons/Trivia & quizzes.png',
  '/game-icons/Video games.png',
  '/game-icons/Word games.png',
  // Characters
  '/characters/Bear.png',
  '/characters/Cat.png',
  '/characters/Dragon.png',
  '/characters/Fox.png',
  '/characters/Ghost.png',
  '/characters/Knight.png',
  '/characters/Lion.png',
  '/characters/Mermaid.png',
  '/characters/Ninja.png',
  '/characters/Octopus.png',
  '/characters/Owl.png',
  '/characters/Phoenix.png',
  '/characters/Pixie.png',
  '/characters/Robot.png',
  '/characters/Unicorn.png',
  '/characters/Viking.png',
  '/characters/Witch.png',
  '/characters/Wolf.png',
  // Elements
  '/elements/Earth.png',
  '/elements/Electricity.png',
  '/elements/Fire.png',
  '/elements/Water.png',
  '/elements/Wind.png',
  // Affiliations
  '/affiliation/Art.png',
  '/affiliation/City.png',
  '/affiliation/Cosmos.png',
  '/affiliation/Country.png',
  '/affiliation/Library.png',
  '/affiliation/Music.png',
  '/affiliation/Nature.png',
  '/affiliation/Sports.png',
  '/affiliation/Tech.png',
  '/affiliation/Travel.png',
  // Icons
  '/icons/Heart.png',
  '/icons/Lightning bolt.png',
  '/icons/Star.png',
];

export function preloadImages() {
  IMAGE_PATHS.forEach((src) => {
    const img = new Image();
    img.src = src;
  });
}
