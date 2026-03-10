import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useOnboardingStore } from '../store/onboardingStore';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  id: number;
  name: string;
  age: number;
  location: string;
  distance: string;
  character: string;
  element: string;
  affiliation: string;
  bio: string;
  games: string[];
  lookingFor: string;
  willMatch: boolean;
  // Lifestyle
  kids: string;
  drinking: string;
  smoking: string;
  cannabis: string;
  pets: string;
  exercise: string;
  favoriteGames: string[];
}

// ─── Image maps ───────────────────────────────────────────────────────────────

const characterImages: Record<string, string> = {
  dragon: '/characters/Dragon.png', cat: '/characters/Cat.png',
  robot: '/characters/Robot.png', phoenix: '/characters/Phoenix.png',
  bear: '/characters/Bear.png', fox: '/characters/Fox.png',
  octopus: '/characters/Octopus.png', owl: '/characters/Owl.png',
  wolf: '/characters/Wolf.png', unicorn: '/characters/Unicorn.png',
  ghost: '/characters/Ghost.png', lion: '/characters/Lion.png',
  witch: '/characters/Witch.png', knight: '/characters/Knight.png',
  viking: '/characters/Viking.png', pixie: '/characters/Pixie.png',
  ninja: '/characters/Ninja.png', mermaid: '/characters/Mermaid.png',
};

const elementImages: Record<string, string> = {
  fire: '/elements/Fire.png', water: '/elements/Water.png',
  earth: '/elements/Earth.png', air: '/elements/Wind.png',
  electric: '/elements/Electricity.png',
};

const affiliationImages: Record<string, string> = {
  city: '/affiliation/City.png', country: '/affiliation/Country.png',
  nature: '/affiliation/Nature.png', fitness: '/affiliation/Sports.png',
  academia: '/affiliation/Library.png', music: '/affiliation/Music.png',
  art: '/affiliation/Art.png', tech: '/affiliation/Tech.png',
  cosmic: '/affiliation/Cosmos.png', travel: '/affiliation/Travel.png',
};

const gameTypeIcons: Record<string, string> = {
  trivia: '/game-icons/Trivia%20%26%20quizzes.png',
  word: '/game-icons/Word%20games.png',
  board: '/game-icons/Boardgames.png',
  video: '/game-icons/Video%20games.png',
  party: '/game-icons/Party%20games.png',
  strategy: '/game-icons/Strategy.png',
  drawing: '/game-icons/Drawing%20%26%20Creative.png',
  puzzles: '/game-icons/Puzzles.png',
  card: '/game-icons/Card%20games.png',
};

const gameTypeLabels: Record<string, string> = {
  trivia: 'Trivia', word: 'Word', board: 'Board', video: 'Video',
  party: 'Party', strategy: 'Strategy', drawing: 'Drawing',
  puzzles: 'Puzzles', card: 'Card',
};

const lookingForColors: Record<string, string> = {
  casual: '#FF3D71', 'short-term': '#FF9F1C',
  'long-term': '#4EFFC4', 'not-sure': '#B565FF', open: '#FFE66D',
};

const lookingForLabels: Record<string, string> = {
  casual: 'Something casual', 'short-term': 'Short-term fun',
  'long-term': 'Long-term', 'not-sure': 'Not sure yet', open: 'Open to anything',
};

const affiliationLabels: Record<string, string> = {
  city: 'City', country: 'Country', nature: 'Nature', fitness: 'Fitness',
  academia: 'Academia', music: 'Music', art: 'Art', tech: 'Tech',
  cosmic: 'Cosmic', travel: 'Travel',
};

const elementLabels: Record<string, string> = {
  fire: 'Fire', water: 'Water', earth: 'Earth', air: 'Air', electric: 'Electric',
};

const lifestyleIcons: Record<string, string> = {
  kids: '/Lifestyle/Baby.png',
  drinking: '/Lifestyle/Cocktail.png',
  smoking: '/Lifestyle/Smoking.png',
  cannabis: '/Lifestyle/Cannabis.png',
  pets: '/Lifestyle/Pets.png',
  exercise: '/Lifestyle/Exercise.png',
};

// ─── Profile data (30 fake UK profiles, ~20% willMatch) ──────────────────────

const PROFILES: Profile[] = [
  { id: 1,  name: 'Zara',    age: 26, location: 'Shoreditch',       distance: '0.8 mi', character: 'fox',     element: 'fire',     affiliation: 'art',      bio: "Muralist by day, trivia queen by night. Will destroy you at board games then buy you a pint. Looking for someone who isn't afraid to lose with dignity.",              games: ['trivia', 'drawing', 'party'],    lookingFor: 'casual',     willMatch: true,  kids: 'Not sure yet',    drinking: 'Socially', smoking: 'Never',    cannabis: 'Sometimes', pets: 'Cat',  exercise: 'Rarely',    favoriteGames: ['Scrabble', 'Codenames'] },
  { id: 2,  name: 'Marcus',  age: 29, location: 'Hackney',          distance: '1.2 mi', character: 'wolf',    element: 'electric', affiliation: 'music',    bio: "DJ & producer. My love language is sending you playlists and losing to you at Scrabble. I'll challenge you to word games at 2am and claim it's part of my creative process.",                     games: ['word', 'party', 'trivia'],       lookingFor: 'open',       willMatch: false, kids: "Don't want",      drinking: 'Often',    smoking: 'Socially', cannabis: 'Often',     pets: 'None', exercise: 'Rarely',    favoriteGames: ['Scrabble', 'Bananagrams'] },
  { id: 3,  name: 'Priya',   age: 24, location: 'Dalston',          distance: '1.5 mi', character: 'unicorn', element: 'water',    affiliation: 'academia', bio: "PhD in cognitive science. I study why people make bad decisions — including mine joining a dating app. Genuinely curious about how your brain works, especially under pressure in a game.",  games: ['strategy', 'trivia', 'puzzles'], lookingFor: 'long-term',  willMatch: false, kids: 'Want someday',    drinking: 'Rarely',   smoking: 'Never',    cannabis: 'Never',     pets: 'Cat',  exercise: 'Sometimes', favoriteGames: ['Chess', 'Trivial Pursuit', 'Catan'] },
  { id: 4,  name: 'Jake',    age: 27, location: 'Peckham',          distance: '2.1 mi', character: 'bear',    element: 'earth',    affiliation: 'fitness',  bio: "Personal trainer with a soft spot for terrible puns and competitive Tetris. I take games as seriously as my clients take squats. First date: something active. Second: destroy you at Tetris.",                             games: ['video', 'party', 'strategy'],    lookingFor: 'short-term', willMatch: false, kids: 'Want someday',    drinking: 'Socially', smoking: 'Never',    cannabis: 'Never',     pets: 'Dog',  exercise: 'Daily',     favoriteGames: ['Tetris', 'FIFA'] },
  { id: 5,  name: 'Isla',    age: 25, location: 'Brixton',          distance: '2.4 mi', character: 'pixie',   element: 'air',      affiliation: 'nature',   bio: "Plant mum and weekend wild swimmer. I play Wordle every morning and take it very seriously. If you don't send me your score, this isn't going to work out.",              games: ['word', 'puzzles', 'board'],      lookingFor: 'open',       willMatch: false, kids: 'Not sure yet',    drinking: 'Rarely',   smoking: 'Never',    cannabis: 'Sometimes', pets: 'Dog',  exercise: 'Often',     favoriteGames: ['Wordle', 'Catan', 'Bananagrams'] },
  { id: 6,  name: 'Theo',    age: 28, location: 'Bermondsey',       distance: '2.9 mi', character: 'robot',   element: 'electric', affiliation: 'tech',     bio: "Software engineer by day, home chef by evening. I feel genuinely bad when I win at word games. I still win. Looking for someone who appreciates both good code and good pasta.",                         games: ['word', 'strategy', 'trivia'],    lookingFor: 'long-term',  willMatch: true,  kids: 'Want someday',    drinking: 'Rarely',   smoking: 'Never',    cannabis: 'Never',     pets: 'None', exercise: 'Sometimes', favoriteGames: ['Chess', 'Catan', 'Codenames'] },
  { id: 7,  name: 'Sofia',   age: 23, location: 'Bethnal Green',    distance: '1.1 mi', character: 'mermaid', element: 'water',    affiliation: 'music',    bio: "Classically trained violinist who secretly loves rhythm games. My cat is named Beethoven. I'm a chaos gremlin at party games and deeply apologetic about it afterwards.",                games: ['party', 'trivia', 'drawing'],    lookingFor: 'casual',     willMatch: false, kids: "Don't want",      drinking: 'Socially', smoking: 'Socially', cannabis: 'Never',     pets: 'Cat',  exercise: 'Sometimes', favoriteGames: ['Guitar Hero', 'Just Dance'] },
  { id: 8,  name: 'Luca',    age: 31, location: 'Islington',        distance: '3.3 mi', character: 'lion',    element: 'fire',     affiliation: 'travel',   bio: "Architect + amateur chef. Cooking is my love language but I'll destroy you at chess first. Been to 40 countries. My ideal Sunday involves a farmers market and a board game.",                games: ['strategy', 'board', 'trivia'],   lookingFor: 'long-term',  willMatch: false, kids: 'Want someday',    drinking: 'Socially', smoking: 'Never',    cannabis: 'Never',     pets: 'None', exercise: 'Often',     favoriteGames: ['Chess', 'Monopoly', 'Ticket to Ride'] },
  { id: 9,  name: 'Amara',   age: 26, location: 'Lewisham',         distance: '4.2 mi', character: 'phoenix', element: 'fire',     affiliation: 'art',      bio: "Fashion designer and Scrabble obsessive. I make all my own clothes and all my own moves. I'm convinced creativity and competitiveness are the same thing.",                 games: ['word', 'drawing', 'party'],      lookingFor: 'open',       willMatch: false, kids: 'Not sure yet',    drinking: 'Socially', smoking: 'Never',    cannabis: 'Sometimes', pets: 'None', exercise: 'Rarely',    favoriteGames: ['Scrabble', 'Pictionary'] },
  { id: 10, name: 'Finn',    age: 27, location: 'Clapham',          distance: '3.8 mi', character: 'owl',     element: 'air',      affiliation: 'academia', bio: "History teacher who knows useless facts about everything. I will absolutely name-drop my pub quiz wins on a first date. Not sorry. If you can name three Tudor monarchs without Googling, message me.",               games: ['trivia', 'strategy', 'board'],   lookingFor: 'short-term', willMatch: false, kids: "Don't want",      drinking: 'Often',    smoking: 'Never',    cannabis: 'Never',     pets: 'None', exercise: 'Sometimes', favoriteGames: ['Trivial Pursuit', 'Catan', 'Diplomacy'] },
  { id: 11, name: 'Mei',     age: 24, location: 'Soho',             distance: '2.0 mi', character: 'cat',     element: 'water',    affiliation: 'art',      bio: "Tattoo artist and Mahjong champion. I drink too much matcha and win too many games. My studio is chaotic and so am I, but everything ends up looking exactly right.",                    games: ['board', 'drawing', 'party'],     lookingFor: 'casual',     willMatch: true,  kids: "Don't want",      drinking: 'Socially', smoking: 'Never',    cannabis: 'Sometimes', pets: 'Cat',  exercise: 'Rarely',    favoriteGames: ['Mahjong', 'Catan'] },
  { id: 12, name: 'Ravi',    age: 29, location: 'Walthamstow',      distance: '5.1 mi', character: 'dragon',  element: 'fire',     affiliation: 'tech',     bio: "Startup founder who stress-bakes sourdough at midnight. Competitive at games, objectively terrible at chess despite owning a very nice chess set. Startup life means I'm good at losing and trying again.",                    games: ['strategy', 'video', 'trivia'],   lookingFor: 'open',       willMatch: false, kids: 'Want someday',    drinking: 'Socially', smoking: 'Socially', cannabis: 'Never',     pets: 'None', exercise: 'Rarely',    favoriteGames: ['Chess (badly)', 'Among Us', 'Catan'] },
  { id: 13, name: 'Nadia',   age: 25, location: 'Hackney Wick',     distance: '1.9 mi', character: 'witch',   element: 'earth',    affiliation: 'nature',   bio: "Herbalist, forager, and extremely petty about Wordle. I will brag about my streak. I forage mushrooms at the weekend and make my own skincare. I take both activities equally seriously.",                      games: ['word', 'puzzles', 'trivia'],     lookingFor: 'long-term',  willMatch: false, kids: 'Want someday',    drinking: 'Rarely',   smoking: 'Never',    cannabis: 'Sometimes', pets: 'Dog',  exercise: 'Often',     favoriteGames: ['Wordle', 'Codenames', 'Boggle'] },
  { id: 14, name: 'Oscar',   age: 30, location: 'Fulham',           distance: '5.6 mi', character: 'knight',  element: 'earth',    affiliation: 'fitness',  bio: "Rugby coach and podcast host. I talk too much about tactics — on the pitch and in Settlers of Catan. My teammates find me motivating. My Catan opponents find me insufferable.",      games: ['strategy', 'board', 'party'],    lookingFor: 'casual',     willMatch: false, kids: 'Want someday',    drinking: 'Often',    smoking: 'Never',    cannabis: 'Never',     pets: 'Dog',  exercise: 'Daily',     favoriteGames: ['Catan', 'Risk', 'Ticket to Ride'] },
  { id: 15, name: 'Yuki',    age: 23, location: 'Shoreditch',       distance: '0.6 mi', character: 'ninja',   element: 'air',      affiliation: 'cosmic',   bio: "UX designer and astrology sceptic who reads their chart every single day. I'm very fast at reaction games and very slow at making decisions about my feelings. Mercury in retrograde, obviously.",             games: ['video', 'party', 'puzzles'],     lookingFor: 'not-sure',   willMatch: false, kids: 'Not sure yet',    drinking: 'Socially', smoking: 'Never',    cannabis: 'Sometimes', pets: 'Cat',  exercise: 'Sometimes', favoriteGames: ['Beat Saber', 'Tetris'] },
  { id: 16, name: 'Ellie',   age: 27, location: 'Greenwich',        distance: '4.7 mi', character: 'ghost',   element: 'air',      affiliation: 'academia', bio: "Marine biologist who designs escape rooms as a hobby. I find every clue and celebrate loudly. I also annotate books in pencil and consider it a love language when someone does the same.",                       games: ['puzzles', 'trivia', 'board'],    lookingFor: 'long-term',  willMatch: false, kids: 'Want someday',    drinking: 'Rarely',   smoking: 'Never',    cannabis: 'Never',     pets: 'None', exercise: 'Often',     favoriteGames: ['Escape room games', 'Trivial Pursuit'] },
  { id: 17, name: 'Dean',    age: 32, location: 'Camberwell',       distance: '3.5 mi', character: 'viking',  element: 'earth',    affiliation: 'travel',   bio: "Travel writer. 60+ countries. Looking for someone to lose to me at cards in an airport lounge. I've eaten things you can't pronounce and slept in places with no wifi. Not complaining.",                 games: ['card', 'trivia', 'word'],        lookingFor: 'open',       willMatch: false, kids: "Don't want",      drinking: 'Often',    smoking: 'Socially', cannabis: 'Never',     pets: 'None', exercise: 'Sometimes', favoriteGames: ['Poker', 'Gin Rummy', 'Cribbage'] },
  { id: 18, name: 'Aisha',   age: 26, location: 'Tottenham',        distance: '6.3 mi', character: 'unicorn', element: 'water',    affiliation: 'music',    bio: "Songwriter and escape room enthusiast. My highs are when I solve a puzzle. My lows are when you beat me. I write songs about neither, but I'm thinking about it.",  games: ['puzzles', 'word', 'party'],      lookingFor: 'casual',     willMatch: false, kids: 'Not sure yet',    drinking: 'Socially', smoking: 'Never',    cannabis: 'Never',     pets: 'None', exercise: 'Rarely',    favoriteGames: ['Wordle', 'Boggle'] },
  { id: 19, name: 'Callum',  age: 28, location: 'Stoke Newington',  distance: '2.8 mi', character: 'fox',     element: 'electric', affiliation: 'city',     bio: "Graphic novelist and obscure board game collector. 97 games. I will make you play the worst one first to filter out the uncommitted. The good news: the good ones are really good.",       games: ['board', 'strategy', 'drawing'],  lookingFor: 'long-term',  willMatch: true,  kids: 'Want someday',    drinking: 'Socially', smoking: 'Never',    cannabis: 'Never',     pets: 'None', exercise: 'Rarely',    favoriteGames: ['Catan', 'Root', 'Spirit Island'] },
  { id: 20, name: 'Nour',    age: 24, location: 'Elephant & Castle', distance: '3.0 mi', character: 'mermaid', element: 'water',   affiliation: 'art',      bio: "Ceramicist and compulsive redecorator. I reorganise furniture when stressed and draw when happy. I play games the same way I make pottery: slowly, intentionally, and with intense focus.",       games: ['drawing', 'puzzles', 'word'],    lookingFor: 'not-sure',   willMatch: false, kids: 'Not sure yet',    drinking: 'Socially', smoking: 'Never',    cannabis: 'Sometimes', pets: 'Cat',  exercise: 'Rarely',    favoriteGames: ['Scrabble', 'Dixit'] },
  { id: 21, name: 'Elliot',  age: 29, location: 'Whitechapel',      distance: '0.9 mi', character: 'robot',   element: 'electric', affiliation: 'tech',     bio: "Data scientist who makes memes as a coping mechanism. I have strong opinions about board game mechanics and mild opinions about everything else. I will spreadsheet our compatibility.", games: ['strategy', 'trivia', 'video'],   lookingFor: 'open',       willMatch: false, kids: "Don't want",      drinking: 'Socially', smoking: 'Never',    cannabis: 'Sometimes', pets: 'None', exercise: 'Sometimes', favoriteGames: ['Chess', 'Ticket to Ride', 'Codenames'] },
  { id: 22, name: 'Temi',    age: 25, location: 'Stockwell',        distance: '4.0 mi', character: 'lion',    element: 'fire',     affiliation: 'fitness',  bio: "Dancer and personal trainer. Competitive at games with zero chill when winning. I'll apologise for gloating and then gloat again. Looking for someone who can handle both.",                                 games: ['party', 'video', 'trivia'],      lookingFor: 'casual',     willMatch: false, kids: 'Want someday',    drinking: 'Socially', smoking: 'Never',    cannabis: 'Never',     pets: 'Dog',  exercise: 'Daily',     favoriteGames: ['Just Dance', 'FIFA', 'Mario Kart'] },
  { id: 23, name: 'Sasha',   age: 27, location: 'Clapton',          distance: '2.3 mi', character: 'owl',     element: 'earth',    affiliation: 'nature',   bio: "Wildlife photographer and Wordle champion. My photos are in two galleries and one GP waiting room. I take long walks with purpose and Wordle with obsession. In that order.",      games: ['word', 'puzzles', 'trivia'],     lookingFor: 'long-term',  willMatch: false, kids: 'Want someday',    drinking: 'Rarely',   smoking: 'Never',    cannabis: 'Never',     pets: 'Dog',  exercise: 'Often',     favoriteGames: ['Wordle', 'Catan', 'Rummikub'] },
  { id: 24, name: 'Alex',    age: 26, location: 'Bermondsey',       distance: '2.7 mi', character: 'phoenix', element: 'fire',     affiliation: 'city',     bio: "Barista + trained sommelier. My tongue can identify 40+ flavours but I still cheat at trivia nights (the good kind of cheating). I will absolutely judge your coffee order.",      games: ['trivia', 'board', 'word'],       lookingFor: 'open',       willMatch: false, kids: 'Not sure yet',    drinking: 'Socially', smoking: 'Socially', cannabis: 'Sometimes', pets: 'None', exercise: 'Sometimes', favoriteGames: ['Trivial Pursuit', 'Catan'] },
  { id: 25, name: 'Jade',    age: 23, location: 'Hoxton',           distance: '0.5 mi', character: 'pixie',   element: 'air',      affiliation: 'art',      bio: "Illustrator who draws fan art of her friends. Will absolutely draw you as an anime character after our first game. Warning: I'm surprisingly ruthless at party games despite looking soft.",  games: ['drawing', 'party', 'word'],      lookingFor: 'casual',     willMatch: true,  kids: "Don't want",      drinking: 'Socially', smoking: 'Never',    cannabis: 'Sometimes', pets: 'Cat',  exercise: 'Rarely',    favoriteGames: ['Pictionary', 'Dixit', 'Telestrations'] },
  { id: 26, name: 'Harry',   age: 30, location: 'Clapham',          distance: '4.4 mi', character: 'bear',    element: 'earth',    affiliation: 'country',  bio: "Landscape architect who moonlights as a competitive chess player. Parks and pawns are my entire personality. I've been told I'm 'surprisingly intense about things that don't matter'.",    games: ['strategy', 'board', 'trivia'],   lookingFor: 'long-term',  willMatch: false, kids: 'Want someday',    drinking: 'Rarely',   smoking: 'Never',    cannabis: 'Never',     pets: 'Dog',  exercise: 'Often',     favoriteGames: ['Chess', 'Catan', 'Pandemic'] },
  { id: 27, name: 'Kezia',   age: 25, location: 'Forest Gate',      distance: '5.8 mi', character: 'witch',   element: 'water',    affiliation: 'cosmic',   bio: "Astrologer and card game shark. I'll read your chart and then hustle you at Poker. In that order. I've been told my moon sign explains a lot about my card game face.",            games: ['card', 'party', 'trivia'],       lookingFor: 'not-sure',   willMatch: false, kids: 'Not sure yet',    drinking: 'Socially', smoking: 'Socially', cannabis: 'Sometimes', pets: 'Cat',  exercise: 'Rarely',    favoriteGames: ['Poker', 'Tarot (it counts)', 'Catan'] },
  { id: 28, name: 'Samir',   age: 28, location: 'Kilburn',          distance: '5.2 mi', character: 'dragon',  element: 'fire',     affiliation: 'travel',   bio: "Filmmaker and terrible loser (genuinely working on it). My best dates involve dark rooms and good stories. My worst involve someone who refuses to explain why they made that move.",             games: ['trivia', 'word', 'party'],       lookingFor: 'open',       willMatch: false, kids: 'Not sure yet',    drinking: 'Socially', smoking: 'Socially', cannabis: 'Never',     pets: 'None', exercise: 'Rarely',    favoriteGames: ['Trivial Pursuit', 'Codenames'] },
  { id: 29, name: 'Rosa',    age: 24, location: 'Brixton',          distance: '2.6 mi', character: 'cat',     element: 'electric', affiliation: 'music',    bio: "Music journalist and rhythm game addict. I review concerts for a living and lose at Guitar Hero for fun. My Spotify wrapped is embarrassing and I refuse to share it.",games: ['party', 'video', 'word'],        lookingFor: 'casual',     willMatch: false, kids: "Don't want",      drinking: 'Often',    smoking: 'Socially', cannabis: 'Sometimes', pets: 'Cat',  exercise: 'Rarely',    favoriteGames: ['Guitar Hero', 'Rock Band', 'Just Dance'] },
  { id: 30, name: 'Ben',     age: 31, location: 'Aldgate',          distance: '1.3 mi', character: 'knight',  element: 'earth',    affiliation: 'academia', bio: "Medieval historian and escape room designer. I literally build the puzzles you play. Good luck. I've never lost at one of my own rooms. I've also never told anyone who has.",          games: ['puzzles', 'strategy', 'board'],  lookingFor: 'long-term',  willMatch: true,  kids: 'Want someday',    drinking: 'Rarely',   smoking: 'Never',    cannabis: 'Never',     pets: 'None', exercise: 'Sometimes', favoriteGames: ['Chess', 'Escape room games', 'Catan'] },
];

// ─── Profile card content (compact, for stack) ───────────────────────────────

function ProfileCard({ profile }: { profile: Profile }) {
  const lfColor = lookingForColors[profile.lookingFor] ?? '#4EFFC4';
  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: 'linear-gradient(175deg, #1C1C3E 0%, #12122A 100%)',
        border: '2px solid rgba(255,255,255,0.1)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
      }}
    >
      {/* Avatar area */}
      <div className="relative flex-shrink-0" style={{ height: '54%', background: '#0E0E22' }}>
        <img
          src={characterImages[profile.character] ?? '/characters/Ghost.png'}
          alt={profile.character}
          className="w-full h-full object-contain"
          draggable={false}
          style={{ padding: '10px', filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.7))' }}
        />
        <div
          className="absolute top-3 right-3 px-2.5 py-1 rounded-full font-body text-xs font-bold"
          style={{ background: 'rgba(0,0,0,0.65)', color: '#4EFFC4', border: '1px solid rgba(78,255,196,0.35)' }}
        >
          {profile.distance}
        </div>
        <div
          className="absolute bottom-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.55)', border: '1.5px solid rgba(255,255,255,0.2)' }}
        >
          <img src={elementImages[profile.element]} alt="" className="w-5 h-5 object-contain" draggable={false} />
        </div>
        <div
          className="absolute bottom-3 left-3 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.55)', border: '1.5px solid rgba(255,255,255,0.2)' }}
        >
          <img src={affiliationImages[profile.affiliation]} alt="" className="w-5 h-5 object-contain" draggable={false} />
        </div>
      </div>

      {/* Info area */}
      <div className="flex-1 px-4 pt-3 pb-3 flex flex-col gap-1.5 min-h-0">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-2xl leading-none" style={{ color: '#FFE66D', textShadow: '0 0 10px rgba(255,230,109,0.5)' }}>
            {profile.name}
          </span>
          <span className="font-body font-bold text-lg" style={{ color: 'rgba(255,255,255,0.65)' }}>
            {profile.age}
          </span>
        </div>
        <div className="flex items-center gap-1 font-body text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
          <svg width="9" height="11" viewBox="0 0 9 11" fill="none">
            <path d="M4.5 0C2.57 0 1 1.57 1 3.5C1 6.12 4.5 11 4.5 11C4.5 11 8 6.12 8 3.5C8 1.57 6.43 0 4.5 0ZM4.5 4.75C3.81 4.75 3.25 4.19 3.25 3.5C3.25 2.81 3.81 2.25 4.5 2.25C5.19 2.25 5.75 2.81 5.75 3.5C5.75 4.19 5.19 4.75 4.5 4.75Z" fill="currentColor"/>
          </svg>
          {profile.location}
        </div>
        <p
          className="font-body text-xs leading-relaxed overflow-hidden"
          style={{ color: 'rgba(255,255,255,0.6)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}
        >
          {profile.bio}
        </p>
        <div className="flex items-center gap-1.5">
          {profile.games.slice(0, 3).map((game) => (
            <div
              key={game}
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              <img src={gameTypeIcons[game]} alt={game} className="w-4 h-4 object-contain" draggable={false} />
            </div>
          ))}
        </div>
        <div className="mt-auto">
          <span
            className="font-body text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ background: `${lfColor}22`, color: lfColor, border: `1px solid ${lfColor}44` }}
          >
            {lookingForLabels[profile.lookingFor]}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Photo carousel (for full profile view) ───────────────────────────────────

function PhotoCarousel({ profile }: { profile: Profile }) {
  const [idx, setIdx] = useState(0);
  const slides = [
    { img: characterImages[profile.character], label: profile.character },
    { img: affiliationImages[profile.affiliation], label: profile.affiliation },
    { img: elementImages[profile.element], label: profile.element },
  ];

  return (
    <div className="relative w-full select-none" style={{ height: 260, background: '#0A0A1E' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <img
            src={slides[idx].img}
            alt=""
            className="h-full w-full object-contain"
            draggable={false}
            style={{ padding: 24, filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.8))' }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Tap zones */}
      <button
        className="absolute left-0 top-0 w-1/2 h-full z-10"
        onClick={() => setIdx((i) => (i - 1 + slides.length) % slides.length)}
        aria-label="Previous photo"
      />
      <button
        className="absolute right-0 top-0 w-1/2 h-full z-10"
        onClick={() => setIdx((i) => (i + 1) % slides.length)}
        aria-label="Next photo"
      />

      {/* Progress dots */}
      <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5 z-10 pointer-events-none">
        {slides.map((_, i) => (
          <motion.div
            key={i}
            className="rounded-full"
            animate={{ width: i === idx ? 20 : 6, background: i === idx ? '#4EFFC4' : 'rgba(255,255,255,0.3)' }}
            style={{ height: 5 }}
            transition={{ duration: 0.2 }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Full profile detail view (slide-up sheet) ───────────────────────────────

function Divider() {
  return <div className="my-5" style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />;
}

function StatRow({ iconKey, label, value }: { iconKey: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <img src={lifestyleIcons[iconKey]} alt="" className="w-5 h-5 object-contain" draggable={false} />
      </div>
      <span className="font-body text-sm flex-1" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</span>
      <span className="font-body text-sm font-bold" style={{ color: 'rgba(255,255,255,0.85)' }}>{value}</span>
    </div>
  );
}

function ProfileDetailView({
  profile,
  onClose,
  onAction,
}: {
  profile: Profile;
  onClose: () => void;
  onAction: (dir: 'left' | 'right') => void;
}) {
  const lfColor = lookingForColors[profile.lookingFor] ?? '#4EFFC4';
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <motion.div
      className="fixed inset-0 z-30 flex flex-col"
      style={{ background: '#12122A' }}
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 320, damping: 34 }}
    >
      {/* Fixed top bar */}
      <div
        className="flex-none flex items-center justify-between px-4 pt-safe pt-3 pb-3 z-10"
        style={{
          background: 'rgba(18,18,42,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <motion.button
          onClick={onClose}
          className="flex items-center gap-1.5 font-body font-bold text-sm"
          style={{ color: 'rgba(255,255,255,0.55)' }}
          whileTap={{ scale: 0.92 }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 5L7.5 10L12.5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </motion.button>

        <div className="flex items-center gap-2">
          <span className="font-body text-xs font-bold" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {profile.distance}
          </span>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto pb-24" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        {/* Photo carousel */}
        <PhotoCarousel profile={profile} />

        {/* Identity header */}
        <div className="px-5 pt-5 pb-1">
          <div className="flex items-baseline gap-2 mb-1">
            <h1
              className="font-display text-4xl leading-none"
              style={{ color: '#FFE66D', textShadow: '0 0 16px rgba(255,230,109,0.55), 4px 4px 0 rgba(0,0,0,0.4)' }}
            >
              {profile.name}
            </h1>
            <span className="font-body font-bold text-2xl" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {profile.age}
            </span>
          </div>

          {/* Location */}
          <div className="flex items-center gap-1.5 mb-3 font-body text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
            <svg width="11" height="14" viewBox="0 0 11 14" fill="none">
              <path d="M5.5 0C3.01 0 1 2.01 1 4.5C1 7.88 5.5 14 5.5 14C5.5 14 10 7.88 10 4.5C10 2.01 7.99 0 5.5 0ZM5.5 6C4.67 6 4 5.33 4 4.5C4 3.67 4.67 3 5.5 3C6.33 3 7 3.67 7 4.5C7 5.33 6.33 6 5.5 6Z" fill="currentColor" />
            </svg>
            {profile.location}
          </div>

          {/* Looking for + avatar labels */}
          <div className="flex flex-wrap gap-2 mb-1">
            <span
              className="font-body text-xs font-bold px-3 py-1.5 rounded-full"
              style={{ background: `${lfColor}1E`, color: lfColor, border: `1.5px solid ${lfColor}4A` }}
            >
              {lookingForLabels[profile.lookingFor]}
            </span>
          </div>

          {/* Avatar badges */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {[
              { img: characterImages[profile.character], label: cap(profile.character) },
              { img: elementImages[profile.element], label: elementLabels[profile.element] },
              { img: affiliationImages[profile.affiliation], label: affiliationLabels[profile.affiliation] },
            ].map(({ img, label }) => (
              <div key={label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <img src={img} alt="" className="w-4 h-4 object-contain" draggable={false} />
                <span className="font-body text-xs font-bold" style={{ color: 'rgba(255,255,255,0.7)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* About section */}
        <div className="px-5 pt-5">
          <Divider />
          <h2 className="font-display text-lg mb-3" style={{ color: '#4EFFC4', textShadow: '0 0 10px rgba(78,255,196,0.4)' }}>
            ABOUT
          </h2>
          <p className="font-body text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>
            {profile.bio}
          </p>
        </div>

        {/* Stats / The Basics */}
        <div className="px-5 pt-5">
          <Divider />
          <h2 className="font-display text-lg mb-1" style={{ color: '#B565FF', textShadow: '0 0 10px rgba(181,101,255,0.4)' }}>
            THE BASICS
          </h2>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <StatRow iconKey="kids"     label="Kids"     value={profile.kids}     />
            <StatRow iconKey="drinking" label="Drinking" value={profile.drinking} />
            <StatRow iconKey="smoking"  label="Smoking"  value={profile.smoking}  />
            <StatRow iconKey="cannabis" label="Cannabis" value={profile.cannabis} />
            <StatRow iconKey="pets"     label="Pets"     value={profile.pets}     />
            <StatRow iconKey="exercise" label="Exercise" value={profile.exercise} />
          </div>
        </div>

        {/* Game preferences */}
        <div className="px-5 pt-5 pb-4">
          <Divider />
          <h2 className="font-display text-lg mb-4" style={{ color: '#FF6BA8', textShadow: '0 0 10px rgba(255,107,168,0.4)' }}>
            LOVES TO PLAY
          </h2>

          {/* Game type icons */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {profile.games.map((game) => (
              <div
                key={game}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <img src={gameTypeIcons[game]} alt={game} className="w-8 h-8 object-contain" draggable={false} />
                <span className="font-body text-xs font-bold" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {gameTypeLabels[game]}
                </span>
              </div>
            ))}
          </div>

          {/* Favourite games */}
          {profile.favoriteGames.length > 0 && (
            <div>
              <p className="font-body text-xs mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Favourite games
              </p>
              <div className="flex flex-wrap gap-2">
                {profile.favoriteGames.map((g) => (
                  <span
                    key={g}
                    className="font-body text-xs px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(255,230,109,0.08)', color: '#FFE66D', border: '1px solid rgba(255,230,109,0.25)' }}
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fixed bottom actions */}
      <div
        className="fixed bottom-0 left-0 right-0 flex gap-3 px-5 py-4 z-10"
        style={{
          background: 'rgba(12,12,28,0.97)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Pass */}
        <motion.button
          onClick={() => onAction('left')}
          className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-display text-lg"
          style={{
            background: 'rgba(255,61,113,0.12)',
            border: '2px solid rgba(255,61,113,0.4)',
            color: '#FF3D71',
          }}
          whileTap={{ scale: 0.95 }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 4L16 16M16 4L4 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          PASS
        </motion.button>

        {/* Like */}
        <motion.button
          onClick={() => onAction('right')}
          className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-display text-lg"
          style={{
            background: 'rgba(78,255,196,0.12)',
            border: '2px solid rgba(78,255,196,0.4)',
            color: '#4EFFC4',
          }}
          whileTap={{ scale: 0.95 }}
        >
          <img src="/icons/Heart.png" alt="" className="w-5 h-5 object-contain" draggable={false} />
          LIKE
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── Background card (static stack) ──────────────────────────────────────────

function BackgroundCard({ profile, stackIndex }: { profile: Profile; stackIndex: 1 | 2 }) {
  const scale = stackIndex === 1 ? 0.96 : 0.92;
  const yPx = stackIndex === 1 ? 12 : 24;
  return (
    <div
      className="absolute inset-0"
      style={{ transform: `scale(${scale}) translateY(${yPx}px)`, transformOrigin: 'center bottom' }}
    >
      <ProfileCard profile={profile} />
    </div>
  );
}

// ─── Top (draggable) card ─────────────────────────────────────────────────────

function TopCard({
  profile,
  swipeCommand,
  onCommandConsumed,
  onSwipeStart,
  onSwipe,
  onExpand,
  disabled,
}: {
  profile: Profile;
  swipeCommand: 'left' | 'right' | null;
  onCommandConsumed: () => void;
  onSwipeStart: () => void;
  onSwipe: (dir: 'left' | 'right') => void;
  onExpand: () => void;
  disabled: boolean;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-20, 20]);
  const likeOpacity = useTransform(x, [20, 80], [0, 1]);
  const nopeOpacity = useTransform(x, [-20, -80], [0, 1]);

  // Track pointer start for tap detection
  const pointerStart = useRef({ x: 0, y: 0 });

  // Ref for pending swipe timeout – cancelled only on unmount, NOT when swipeCommand
  // changes back to null. Without this separation the effect cleanup would fire
  // (because swipeCommand dep changed) and clearTimeout() the onSwipe call before
  // it ran, leaving `disabled` stuck at true forever.
  const swipePending = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  // Programmatic swipe from buttons
  useEffect(() => {
    if (!swipeCommand) return;
    onCommandConsumed();          // sets swipeCommand → null, triggers re-render
    const dir = swipeCommand;     // capture value before state update
    const exitX = dir === 'right' ? 750 : -750;
    animate(x, exitX, { type: 'tween', duration: 0.28, ease: [0.32, 0, 0.67, 0] });
    swipePending.current = window.setTimeout(() => {
      swipePending.current = null;
      onSwipe(dir);
    }, 280);
    // No cleanup here – clearing the timeout here would race with the
    // re-render caused by onCommandConsumed() above.
  }, [swipeCommand]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cancel only on unmount (e.g. navigating away mid-animation)
  useEffect(() => {
    return () => { if (swipePending.current) window.clearTimeout(swipePending.current); };
  }, []);

  const handleDragEnd = (_: unknown, info: { velocity: { x: number } }) => {
    const dx = x.get();
    const vx = info.velocity.x;
    if (dx > 80 || vx > 500) {
      onSwipeStart();
      animate(x, 750, { type: 'tween', duration: 0.28 });
      window.setTimeout(() => onSwipe('right'), 280);
    } else if (dx < -80 || vx < -500) {
      onSwipeStart();
      animate(x, -750, { type: 'tween', duration: 0.28 });
      window.setTimeout(() => onSwipe('left'), 280);
    } else {
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 35 });
    }
  };

  return (
    <motion.div
      className="absolute inset-0 select-none"
      style={{ x, rotate, cursor: disabled ? 'default' : 'grab' }}
      drag={disabled ? false : 'x'}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.8}
      onDragEnd={handleDragEnd}
      onPointerDown={(e) => { pointerStart.current = { x: e.clientX, y: e.clientY }; }}
      onClick={(e) => {
        if (disabled) return;
        const dx = Math.abs(e.clientX - pointerStart.current.x);
        const dy = Math.abs(e.clientY - pointerStart.current.y);
        if (dx < 8 && dy < 8) onExpand();
      }}
    >
      {/* LIKE stamp */}
      <motion.div
        className="absolute top-6 right-5 z-20 font-display text-2xl border-[3px] rounded-xl px-3 py-0.5 pointer-events-none"
        style={{ opacity: likeOpacity, color: '#4EFFC4', borderColor: '#4EFFC4', textShadow: '0 0 15px rgba(78,255,196,0.7)', rotate: -15 }}
      >
        LIKE
      </motion.div>

      {/* NOPE stamp */}
      <motion.div
        className="absolute top-6 left-5 z-20 font-display text-2xl border-[3px] rounded-xl px-3 py-0.5 pointer-events-none"
        style={{ opacity: nopeOpacity, color: '#FF6BA8', borderColor: '#FF6BA8', textShadow: '0 0 15px rgba(255,107,168,0.7)', rotate: 15 }}
      >
        NOPE
      </motion.div>

      <ProfileCard profile={profile} />
    </motion.div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <motion.div className="flex flex-col items-center gap-6 text-center px-6" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
      <motion.div animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
        <img src="/icons/Star.png" alt="" className="w-16 h-16 object-contain" draggable={false} style={{ filter: 'drop-shadow(0 0 12px rgba(255,230,109,0.7))' }} />
      </motion.div>
      <div>
        <p className="font-display text-3xl mb-2" style={{ color: '#FFE66D', textShadow: '0 0 15px rgba(255,230,109,0.6)' }}>GAME OVER</p>
        <p className="font-body text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>You've seen everyone nearby.</p>
      </div>
      <button
        onClick={onReset}
        className="font-body font-bold text-sm px-6 py-3 rounded-xl"
        style={{ background: 'linear-gradient(135deg, #4EFFC4 0%, #B565FF 100%)', color: '#12122A', boxShadow: '0 0 20px rgba(78,255,196,0.35), 4px 4px 0 rgba(0,0,0,0.3)' }}
      >
        INSERT COIN AGAIN →
      </button>
    </motion.div>
  );
}

// ─── Match modal ──────────────────────────────────────────────────────────────

function MatchModal({ matchProfile, userCharacter, onDismiss, onPlay }: {
  matchProfile: Profile; userCharacter: string; onDismiss: () => void; onPlay: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.88)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, pointerEvents: 'none' }}
      transition={{ duration: 0.18 }}
      onClick={onDismiss}
    >
      <motion.div
        className="relative w-full max-w-sm rounded-3xl overflow-hidden px-6 pt-8 pb-8 text-center"
        style={{ background: 'linear-gradient(175deg, #1C1C3E 0%, #12122A 100%)', border: '2px solid rgba(255,255,255,0.12)', boxShadow: '0 0 60px rgba(78,255,196,0.2)' }}
        initial={{ scale: 0.6, y: 60, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(78,255,196,0.08) 0%, transparent 70%)' }} />
        <motion.div
          className="font-display text-4xl leading-none mb-1"
          style={{ color: '#4EFFC4', textShadow: '0 0 30px rgba(78,255,196,0.9), 0 0 60px rgba(78,255,196,0.4)' }}
          animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          IT'S A MATCH!
        </motion.div>
        <p className="font-body text-sm mb-7" style={{ color: 'rgba(255,255,255,0.5)' }}>You and {matchProfile.name} liked each other</p>
        <div className="flex items-center justify-center gap-4 mb-8">
          <motion.div className="w-24 h-24 rounded-full overflow-hidden border-4 flex-shrink-0"
            style={{ borderColor: '#4EFFC4', boxShadow: '0 0 20px rgba(78,255,196,0.5)', background: '#0E0E22' }}
            initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
            <img src={characterImages[userCharacter] ?? '/characters/Ghost.png'} alt="you" className="w-full h-full object-contain p-2" draggable={false} />
          </motion.div>
          <motion.div animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}>
            <img src="/icons/Heart.png" alt="" className="w-9 h-9 object-contain" draggable={false} style={{ filter: 'drop-shadow(0 0 10px rgba(255,107,168,0.8))' }} />
          </motion.div>
          <motion.div className="w-24 h-24 rounded-full overflow-hidden border-4 flex-shrink-0"
            style={{ borderColor: '#FF6BA8', boxShadow: '0 0 20px rgba(255,107,168,0.5)', background: '#0E0E22' }}
            initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
            <img src={characterImages[matchProfile.character] ?? '/characters/Ghost.png'} alt={matchProfile.name} className="w-full h-full object-contain p-2" draggable={false} />
          </motion.div>
        </div>
        <motion.button onClick={onPlay} className="w-full py-4 rounded-xl font-display text-xl mb-3"
          style={{ background: 'linear-gradient(135deg, #4EFFC4 0%, #B565FF 100%)', color: '#12122A', boxShadow: '0 0 24px rgba(78,255,196,0.4), 4px 4px 0 rgba(0,0,0,0.35)', border: '3px solid rgba(255,255,255,0.2)' }}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          PLAY NOW ▶
        </motion.button>
        <button onClick={onDismiss} className="w-full py-2 font-body font-bold text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Maybe Later
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Bottom nav ───────────────────────────────────────────────────────────────

function BottomNav({ onProfile, onMatches }: { onProfile: () => void; onMatches: () => void }) {
  return (
    <nav className="flex-none flex items-stretch border-t" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(14,14,34,0.97)' }}>
      <button className="flex-1 flex flex-col items-center justify-center gap-1 py-3" onClick={onMatches} style={{ color: 'rgba(255,255,255,0.35)' }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 19.25C11 19.25 2.75 14.667 2.75 9.167C2.75 6.728 4.728 4.75 7.167 4.75C8.574 4.75 9.828 5.4 10.657 6.427L11 6.844L11.343 6.427C12.172 5.4 13.426 4.75 14.833 4.75C17.272 4.75 19.25 6.728 19.25 9.167C19.25 14.667 11 19.25 11 19.25Z" fill="currentColor"/></svg>
        <span className="font-body text-xs">Matches</span>
      </button>
      <button className="flex-1 flex flex-col items-center justify-center gap-1 py-3" style={{ color: '#4EFFC4' }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8.25" stroke="currentColor" strokeWidth="1.75"/><path d="M14.85 7.15L12.35 12.35L7.15 14.85L9.65 9.65L14.85 7.15Z" fill="currentColor"/></svg>
        <span className="font-body text-xs font-bold">Discover</span>
      </button>
      <button className="flex-1 flex flex-col items-center justify-center gap-1 py-3" onClick={onProfile} style={{ color: 'rgba(255,255,255,0.35)' }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="7.5" r="3.5" stroke="currentColor" strokeWidth="1.75"/><path d="M3.5 18.5C3.5 15.462 6.91 13 11 13C15.09 13 18.5 15.462 18.5 18.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/></svg>
        <span className="font-body text-xs">Profile</span>
      </button>
    </nav>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function DiscoverScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matchProfile, setMatchProfile] = useState<Profile | null>(null);
  const [disabled, setDisabled] = useState(false);
  const [swipeCommand, setSwipeCommand] = useState<'left' | 'right' | null>(null);
  const [expandedProfile, setExpandedProfile] = useState<Profile | null>(null);
  const navigate = useNavigate();
  const { character } = useOnboardingStore();

  const remaining = PROFILES.length - currentIndex;
  const showEmpty = currentIndex >= PROFILES.length;

  const handleSwipe = (dir: 'left' | 'right') => {
    const profile = PROFILES[currentIndex];
    setCurrentIndex((i) => i + 1);
    setDisabled(false);
    if (dir === 'right' && profile.willMatch) {
      window.setTimeout(() => setMatchProfile(profile), 100);
    }
  };

  const executeButtonSwipe = (dir: 'left' | 'right') => {
    if (disabled || showEmpty) return;
    setDisabled(true);
    setSwipeCommand(dir);
  };

  // From detail view: close detail then trigger swipe
  const handleDetailAction = (dir: 'left' | 'right') => {
    setExpandedProfile(null);
    window.setTimeout(() => executeButtonSwipe(dir), 50);
  };

  const stackDepth = Math.min(remaining, 3);

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#12122A' }}>
      {/* Scanlines */}
      <div className="fixed inset-0 pointer-events-none z-40 opacity-[0.025]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,1) 3px, rgba(255,255,255,1) 4px)' }}
      />

      {/* Header */}
      <header className="flex-none flex items-center justify-between px-5 pt-5 pb-3">
        <div className="font-display text-2xl" style={{ color: '#FFE66D', textShadow: '0 0 16px rgba(255,230,109,0.65), 4px 4px 0 rgba(0,0,0,0.4)' }}>
          DUEL
        </div>
        <div className="flex items-center gap-2.5">
          {!showEmpty && (
            <span className="font-body text-xs font-bold" style={{ color: 'rgba(255,255,255,0.35)' }}>{remaining} nearby</span>
          )}
          <div className="w-9 h-9 rounded-full overflow-hidden border-2 flex-shrink-0"
            style={{ borderColor: '#4EFFC4', background: '#0E0E22', boxShadow: '0 0 10px rgba(78,255,196,0.35)' }}>
            {character
              ? <img src={characterImages[character]} alt="" className="w-full h-full object-contain p-0.5" draggable={false} />
              : <div className="w-full h-full" style={{ background: 'rgba(78,255,196,0.2)' }} />
            }
          </div>
        </div>
      </header>

      {/* Card stack */}
      <div className="flex-1 flex items-center justify-center px-5 overflow-hidden">
        {showEmpty ? (
          <EmptyState onReset={() => { setCurrentIndex(0); setDisabled(false); }} />
        ) : (
          <div className="relative w-full" style={{ maxWidth: 340, height: 460 }}>
            {stackDepth >= 3 && <BackgroundCard profile={PROFILES[currentIndex + 2]} stackIndex={2} />}
            {stackDepth >= 2 && <BackgroundCard profile={PROFILES[currentIndex + 1]} stackIndex={1} />}
            <TopCard
              key={PROFILES[currentIndex].id}
              profile={PROFILES[currentIndex]}
              swipeCommand={swipeCommand}
              onCommandConsumed={() => setSwipeCommand(null)}
              onSwipeStart={() => setDisabled(true)}
              onSwipe={handleSwipe}
              onExpand={() => !disabled && setExpandedProfile(PROFILES[currentIndex])}
              disabled={disabled || expandedProfile !== null}
            />
          </div>
        )}
      </div>

      {/* Action buttons */}
      {!showEmpty && (
        <div className="flex-none flex items-center justify-center gap-10 py-3">
          <motion.button onClick={() => executeButtonSwipe('left')} disabled={disabled}
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,61,113,0.12)', border: '2px solid rgba(255,61,113,0.45)', boxShadow: '0 0 18px rgba(255,61,113,0.18)' }}
            whileTap={{ scale: 0.88 }} whileHover={{ scale: 1.08, boxShadow: '0 0 28px rgba(255,61,113,0.35)' }}>
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <path d="M5 5L21 21M21 5L5 21" stroke="#FF3D71" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </motion.button>
          <motion.button onClick={() => executeButtonSwipe('right')} disabled={disabled}
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(78,255,196,0.12)', border: '2px solid rgba(78,255,196,0.45)', boxShadow: '0 0 18px rgba(78,255,196,0.18)' }}
            whileTap={{ scale: 0.88 }} whileHover={{ scale: 1.08, boxShadow: '0 0 28px rgba(78,255,196,0.35)' }}>
            <img src="/icons/Heart.png" alt="like" className="w-7 h-7 object-contain" draggable={false}
              style={{ filter: 'drop-shadow(0 0 6px rgba(78,255,196,0.6))' }} />
          </motion.button>
        </div>
      )}

      {/* Bottom nav */}
      <BottomNav onMatches={() => navigate('/matches')} onProfile={() => navigate('/profile')} />

      {/* Full profile detail view */}
      <AnimatePresence>
        {expandedProfile && (
          <ProfileDetailView
            key={expandedProfile.id}
            profile={expandedProfile}
            onClose={() => setExpandedProfile(null)}
            onAction={handleDetailAction}
          />
        )}
      </AnimatePresence>

      {/* Match modal */}
      <AnimatePresence>
        {matchProfile && (
          <MatchModal
            matchProfile={matchProfile}
            userCharacter={character ?? 'ghost'}
            onDismiss={() => setMatchProfile(null)}
            onPlay={() => { setMatchProfile(null); navigate('/play'); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
