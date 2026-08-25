// Fixtures extraídas de design/pendev/youtube-channel.pen (tela Channel — Videos).
// Conteúdo é DADO, não design: o componente recebe tudo por prop.

export type Video = {
  id: string;
  title: string;
  meta: string;
  duration: string;
};

export const VIDEOS: Video[] = [
  {
    "id": "mG7ZC63xS-k",
    "title": "Coding with AI this way is a waste of time",
    "meta": "971 views • 3 days ago",
    "duration": "23:42"
  },
  {
    "id": "w2z4Fai2s9c",
    "title": "Stop Creating AI Skills Without Doing This",
    "meta": "1.8K views • 5 days ago",
    "duration": "12:29"
  },
  {
    "id": "RO5y-fCIBy8",
    "title": "The Developer as You Know It Is Coming to an End!",
    "meta": "3.8K views • 7 days ago",
    "duration": "17:46"
  },
  {
    "id": "V3Mtur9JuKY",
    "title": "Google ADK in Practice: Build Your First AI Agent",
    "meta": "1K views • 10 days ago",
    "duration": "30:05"
  },
  {
    "id": "HGvUc9nDJC0",
    "title": "Agent Skills: Everything You Need to Know to Build Skills",
    "meta": "705 views • 12 days ago",
    "duration": "17:32"
  },
  {
    "id": "FCwIlzanP4Q",
    "title": "Harness Engineering: Agents, Sub-Agents, and Context Window",
    "meta": "1.3K views • 2 weeks ago",
    "duration": "16:06"
  },
  {
    "id": "9_atL4yQEa0",
    "title": "Developers: Understand What AI Agents Really Are",
    "meta": "843 views • 2 weeks ago",
    "duration": "14:21"
  },
  {
    "id": "ZfpYVS7oG6A",
    "title": "What Is the Developer's Role When AI Already Writes the Code?",
    "meta": "5.5K views • 2 weeks ago",
    "duration": "17:07"
  },
  {
    "id": "aYEa5svlzC0",
    "title": "RAG is Not an AI Agent: The Difference Most People Ignore",
    "meta": "4.9K views • 3 weeks ago",
    "duration": "15:35"
  }
];

export const CHANNEL = {
  name: "Full Cycle",
  handle: "@FullCycle",
  subscribers: "196K subscribers",
  videoCount: "1K videos",
  description:
    "A Full Cycle ajuda desenvolvedores a desenvolverem aplicações de grande porte!",
  link: "fullcycle.com.br",
  moreLinks: "and 1 more link",
} as const;
