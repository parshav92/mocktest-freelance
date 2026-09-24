import csv
from pathlib import Path

rows = [
    {
        "code": "WR_001",
        "subject": "writing",
        "difficulty": "medium",
        "topic": "Narrative",
        "subtopic": "Imaginative / Adventure",
        "prompt": (
            "Beyond the Fence\n\n"
            "For years, everyone in your town has been warned never to go beyond a tall fence "
            "at the edge of the community. One day, the gate is left open.\n\n"
            "Write a story about someone who decides to cross the fence.\n\n"
            "In your writing, you could:\n"
            "- describe what lies beyond the fence\n"
            "- explain why the character takes the risk\n"
            "- reveal a surprising discovery."
        ),
        "word_limit": 400,
        "time_mins": 30,
    },
    {
        "code": "WR_002",
        "subject": "writing",
        "difficulty": "medium",
        "topic": "Narrative",
        "subtopic": "Reflective",
        "prompt": (
            "The Time Capsule\n\n"
            "While digging in your backyard, you discover a metal box buried by a student your age "
            "exactly 100 years ago. Inside is a single object and a mysterious note.\n\n"
            "Write a story about the day you found the capsule and what happened when you showed "
            "the contents to your family or friends.\n\n"
            "In your writing, you could:\n"
            "- Describe the object in detail.\n"
            "- Explain the message written on the note.\n"
            "- Describe the emotions you felt as you uncovered a piece of the past."
        ),
        "word_limit": 400,
        "time_mins": 30,
    },
    {
        "code": "WR_003",
        "subject": "writing",
        "difficulty": "medium",
        "topic": "Narrative",
        "subtopic": "Imaginative",
        "prompt": (
            "The Island That Appeared Overnight\n\n"
            "A mysterious island suddenly appears off the coast of Australia. No maps, satellites "
            "or experts can explain where it came from.\n\n"
            "Write a newspaper report or imaginative story about the discovery.\n\n"
            "In your writing, you could:\n"
            "- describe the island\n"
            "- explain how people react\n"
            "- reveal a mystery connected to the island."
        ),
        "word_limit": 400,
        "time_mins": 30,
    },
    {
        "code": "WR_004",
        "subject": "writing",
        "difficulty": "medium",
        "topic": "Narrative",
        "subtopic": "Dystopian / Diary",
        "prompt": (
            "Life Inside the Dome\n\n"
            "In the year 2095, pollution has made the outside world dangerous, so people live "
            "inside giant protective domes.\n\n"
            "Write a story or diary entry from the perspective of someone living there.\n\n"
            "In your writing, you could:\n"
            "- describe daily life inside the dome\n"
            "- explain what people believe about the outside world\n"
            "- reveal an important discovery."
        ),
        "word_limit": 400,
        "time_mins": 30,
    },
    {
        "code": "WR_005",
        "subject": "writing",
        "difficulty": "medium",
        "topic": "Narrative",
        "subtopic": "Speculative",
        "prompt": (
            "The Last Tree\n\n"
            "In the future, only one tree remains alive on Earth, protected inside a secure glass chamber.\n\n"
            "Write a story, speech or report connected to this tree.\n\n"
            "In your writing, you could:\n"
            "- describe why trees disappeared\n"
            "- explain why the last tree matters\n"
            "- explore a conflict involving the tree."
        ),
        "word_limit": 400,
        "time_mins": 30,
    },
    {
        "code": "WR_006",
        "subject": "writing",
        "difficulty": "medium",
        "topic": "Narrative",
        "subtopic": "Creative",
        "prompt": (
            "The Silent Day\n\n"
            "Imagine you wake up one Tuesday morning and realize that no one, including yourself, "
            "can speak. Human voices have completely vanished for 24 hours.\n\n"
            "Write a diary entry describing your day of silence. Start your entry with the following sentence:\n\n"
            "I tried to scream when I saw the burnt toast, but the only sound in the kitchen was the ticking of the clock.\n\n"
            "In your writing, you could include:\n"
            "- How you communicated with your friends at school.\n"
            "- The surprising things you noticed when the world became quiet.\n"
            "- How your perspective changed by the time your voice returned."
        ),
        "word_limit": 400,
        "time_mins": 30,
    },
    {
        "code": "WR_007",
        "subject": "writing",
        "difficulty": "medium",
        "topic": "Narrative",
        "subtopic": "Anthropomorphic",
        "prompt": (
            "The Animal's Perspective\n\n"
            'A local zoo is trialing a "Universal Translator" that allows humans to understand '
            "what animals are saying for one hour a day.\n\n"
            "Write a narrative from the perspective of an animal (e.g., an elephant, an eagle, or a platypus) "
            "during that one hour when humans can finally hear you.\n\n"
            "In your writing, you could:\n"
            "- Describe the crowd of people gathered around your enclosure.\n"
            "- Detail what you chose to tell them.\n"
            "- Explain how the humans reacted to your words."
        ),
        "word_limit": 400,
        "time_mins": 30,
    },
    {
        "code": "WR_008",
        "subject": "writing",
        "difficulty": "medium",
        "topic": "Narrative",
        "subtopic": "Adventure",
        "prompt": (
            "Lost in Translation\n\n"
            "You are traveling in a foreign country where you don't speak the language. "
            "You lose your bag containing your phone, money, and map.\n\n"
            "Write a story about how you managed to find your way back to your hotel using only "
            "non-verbal communication.\n\n"
            "In your writing:\n"
            '- Focus on "showing" rather than "telling" (e.g., using gestures, drawings, or expressions).\n'
            "- Describe a helpful stranger you met.\n"
            "- Build tension as it starts to get dark."
        ),
        "word_limit": 400,
        "time_mins": 30,
    },
    {
        "code": "WR_009",
        "subject": "writing",
        "difficulty": "medium",
        "topic": "Narrative",
        "subtopic": "Reflective / Adventure / Thriller",
        "prompt": (
            "The Mystery Gift\n\n"
            "On your 12th birthday, you receive a package with no return address. Inside is an old, rusty key "
            'with a tag that says: "Find the door this opens before the sun sets."\n\n'
            "Write a narrative about your race against time to find the door.\n\n"
            "In your writing, you could:\n"
            "- Describe the different places the key took you.\n"
            "- Create a sense of urgency (pacing).\n"
            '- End with a "cliffhanger" or a surprising reveal of what was behind the door.'
        ),
        "word_limit": 400,
        "time_mins": 30,
    },
    {
        "code": "WR_010",
        "subject": "writing",
        "difficulty": "medium",
        "topic": "Persuasive",
        "subtopic": "Argumentative / Speech",
        "prompt": (
            "Digital vs. Physical\n\n"
            "Your local council is planning to close the town's physical library and replace it entirely "
            'with a high-tech "Digital Hub" where there are no paper books, only screens and VR headsets.\n\n'
            "Write a letter to the Mayor expressing your opinion on this change. You can choose to be in "
            "favour of the digital upgrade or argue to keep the physical books.\n\n"
            "In your letter, you could:\n"
            "- Argue how this change affects students and the elderly.\n"
            '- Discuss the importance of technology versus the "feel" of traditional books.\n'
            "- Suggest a compromise that benefits the whole community."
        ),
        "word_limit": 400,
        "time_mins": 30,
    },
    {
        "code": "WR_011",
        "subject": "writing",
        "difficulty": "medium",
        "topic": "Persuasive",
        "subtopic": "Argumentative",
        "prompt": (
            "The Homework Machine\n\n"
            "A company invents a machine that completes all homework perfectly in seconds. "
            "Schools are deciding whether students should be allowed to use it.\n\n"
            "Write a persuasive speech either supporting or opposing the machine.\n\n"
            "In your writing, you could:\n"
            "- discuss fairness and learning\n"
            "- explain possible consequences\n"
            "- persuade your audience with strong examples."
        ),
        "word_limit": 400,
        "time_mins": 30,
    },
    {
        "code": "WR_012",
        "subject": "writing",
        "difficulty": "medium",
        "topic": "Persuasive",
        "subtopic": "Editorial / Opinion",
        "prompt": (
            'The "Un-Discovery"\n\n'
            'Scientists have developed a "Memory Eraser" that can make people forget a specific bad event '
            "in history or a personal tragedy. Some say it's a blessing; others say it's dangerous to forget the past.\n\n"
            "Write an editorial (opinion piece) for a magazine arguing whether this technology should be banned "
            "or made available to the public.\n\n"
            "In your editorial, you could:\n"
            "- Discuss the importance of learning from mistakes.\n"
            "- Explain the benefits for people suffering from trauma.\n"
            '- Use a strong "call to action" to finish your piece.'
        ),
        "word_limit": 400,
        "time_mins": 30,
    },
    {
        "code": "WR_013",
        "subject": "writing",
        "difficulty": "medium",
        "topic": "Persuasive",
        "subtopic": "Editorial",
        "prompt": (
            "The Budget Challenge\n\n"
            "Your school has been given a $10,000 grant, but the student body is divided. "
            "Half the students want a new high-tech gaming/coding lab, and the other half want a massive "
            "outdoor community garden and kitchen.\n\n"
            "Write the speech you would give at the school assembly to convince your peers and teachers "
            "to support your choice.\n\n"
            "In your speech:\n"
            "- Use rhetorical questions to engage the audience.\n"
            "- Explain the long-term benefits of your chosen project.\n"
            "- Address the opposing view and explain why your idea is better."
        ),
        "word_limit": 400,
        "time_mins": 30,
    },
    {
        "code": "WR_014",
        "subject": "writing",
        "difficulty": "medium",
        "topic": "Informative",
        "subtopic": "Expository / Report",
        "prompt": (
            "Unexpected Discovery\n\n"
            "Hikers in the Blue Mountains have discovered a hidden valley that was previously unmapped. "
            "Surprisingly, they found plants and small animals there that were thought to be extinct for millions of years.\n\n"
            "Write a newspaper report for The NSW Gazette about this scientific breakthrough.\n\n"
            "In your report, you could:\n"
            "- Create a catchy headline.\n"
            "- Explain how the valley remained hidden for so long.\n"
            "- Include quotes from a lead scientist and one of the hikers who found it."
        ),
        "word_limit": 400,
        "time_mins": 30,
    },
    {
        "code": "WR_015",
        "subject": "writing",
        "difficulty": "medium",
        "topic": "Informative",
        "subtopic": "Proposal",
        "prompt": (
            "The School of the Future\n\n"
            'Your school has been selected to pilot a "Student-Led Learning" program. For one week, students '
            "get to decide the curriculum, the layout of the classrooms, and the rules of the school.\n\n"
            "Write a proposal to your Principal outlining your vision for this pilot week.\n\n"
            "In your proposal, you could:\n"
            "- Suggest new subjects that are not currently taught.\n"
            "- Describe how the physical classroom should be redesigned to help students learn.\n"
            "- Explain how this program will make students more responsible."
        ),
        "word_limit": 400,
        "time_mins": 30,
    },
]

# Keep prompts as single-line for Excel-safe CSV (newlines -> spaces)
for row in rows:
    row["prompt"] = " ".join(
        line.strip() for line in row["prompt"].splitlines() if line.strip()
    )

out = Path(r"c:\Users\Neel Jain\Downloads\nsw-selective-writing-essays.csv")
with out.open("w", encoding="utf-8-sig", newline="") as f:
    writer = csv.DictWriter(
        f,
        fieldnames=[
            "code",
            "subject",
            "difficulty",
            "topic",
            "subtopic",
            "prompt",
            "word_limit",
            "time_mins",
        ],
        quoting=csv.QUOTE_MINIMAL,
        lineterminator="\n",
    )
    writer.writeheader()
    writer.writerows(rows)

print(f"Wrote {len(rows)} rows -> {out}")
for r in rows:
    print(f"  {r['code']}: {r['topic']} / {r['subtopic']}")
