-- NSW Selective Writing: dynamic marking criteria by style/sub-style

CREATE TABLE writing_marking_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    main_topic TEXT NOT NULL,
    sub_topic TEXT,
    key_focus TEXT,
    marking_criteria JSONB NOT NULL DEFAULT '{"criteria":[]}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT writing_marking_criteria_topic_subtopic_unique
        UNIQUE (main_topic, sub_topic)
);

CREATE INDEX idx_writing_marking_criteria_main_topic
    ON writing_marking_criteria (main_topic);

CREATE INDEX idx_writing_marking_criteria_subtopic_lookup
    ON writing_marking_criteria (main_topic, sub_topic)
    WHERE sub_topic IS NOT NULL;

ALTER TABLE essay_evaluations
    ALTER COLUMN rubric DROP NOT NULL;

-- Style-level criteria (sub_topic IS NULL)
INSERT INTO writing_marking_criteria (main_topic, sub_topic, key_focus, marking_criteria) VALUES
(
    'Narrative',
    NULL,
    NULL,
    '{"criteria":[{"name":"Ideas","descriptions":{"high":"Imaginative ideas are crafted to contribute effectively to the prompt''s discovery or risk.","satisfactory":"The story follows the prompt but the \"discovery\" may be generic or lack impact."}},{"name":"Paragraphing","descriptions":{"high":"Paragraphs are ordered to pace the story and build tension (especially for \"The Mystery Gift\").","satisfactory":"Paragraphs are used to separate ideas but do not actively contribute to the pacing or tension."}},{"name":"Vocabulary","descriptions":{"high":"Uses precise language for atmosphere, such as \"message of empowerment\" or \"young protagonists\".","satisfactory":"Language is functional and clear but lacks descriptive flair or variety."}},{"name":"Cohesion","descriptions":{"high":"Uses a range of referring words and text connectives to guide the reader through the plot.","satisfactory":"Cohesion is mostly achieved through simple connectives (e.g., \"then,\" \"next,\" \"so\")."}}]}'::jsonb
),
(
    'Persuasive',
    NULL,
    NULL,
    '{"criteria":[{"name":"Audience","descriptions":{"high":"Establishes a strong, credible voice with an engaging introduction designed to influence.","satisfactory":"The voice is identifiable but may lack consistent influence or a strong hook."}},{"name":"Ideas","descriptions":{"high":"Carefully selected and crafted to be highly persuasive (e.g., discussing fairness in \"The Homework Machine\").","satisfactory":"Ideas are relevant but may be predictable or loosely connected to the main position."}},{"name":"Persuasive Techniques","descriptions":{"high":"Uses a range of techniques like emotive language, personal address, and rhetorical questions correctly.","satisfactory":"Uses 1-2 techniques (e.g., a single rhetorical question) but relies mostly on direct statements."}},{"name":"Text Structure","descriptions":{"high":"Introduction foreshadows the argument; body develops each point; conclusion reinforces the position.","satisfactory":"Follows a basic structure but the conclusion may be brief or repetitive."}}]}'::jsonb
),
(
    'Informative',
    NULL,
    NULL,
    '{"criteria":[{"name":"Indicator","descriptions":{"high":"Use of third-person perspective and passive voice where appropriate (e.g., \"It was discovered that...\" rather than \"I think...\").","satisfactory":"Text provides information and does not include personal bias. Use of passive voice."}},{"name":"Text Structure","descriptions":{"high":"All components (e.g., introduction, specific suggestions, and conclusion) are well developed. The text maintains a neutral, authoritative tone that prioritizes information over personal bias.","satisfactory":"Information is grouped together but may lack the formal structure of a proposal or report."}},{"name":"Sentence Structure","descriptions":{"high":"Demonstrates a variety of clause structures and sentence lengths to explain complex ideas.","satisfactory":"Sentences are mostly simple or compound; lack of variety makes the report feel repetitive."}},{"name":"Expert voice / Credibility","descriptions":{"high":"Use of technical or subject-specific vocabulary (e.g., \"extinct flora,\" \"pilot program,\" \"unmapped terrain\"). Including \"quotes\" from a lead scientist or hiker to add weight to the report or presenting a professional vision to a Principal.","satisfactory":"Use of basic technical or subject specific vocabulary."}}]}'::jsonb
),
(
    'General',
    NULL,
    NULL,
    '{"criteria":[{"name":"Heading","descriptions":{"high":"An attention-capturing and highly appropriate heading/headline is provided.","satisfactory":"A heading is present but it is a simple restatement of the topic."}},{"name":"Vocabulary","descriptions":{"high":"Uses precise language for atmosphere, such as \"message of empowerment\" or \"young protagonists\".","satisfactory":"Language is functional and clear but lacks descriptive flair or variety."}},{"name":"Sentence Structure","descriptions":{"high":"A mix of short, punchy sentences for impact and long, complex sentences for detailed explanation.","satisfactory":"Consistent use of compound sentences with some emerging complex structures."}},{"name":"Spelling","descriptions":{"high":"No mistakes in key words or specialized vocabulary related to the topic (e.g., \"extinct\" or \"curriculum\").","satisfactory":"General spelling is good, but complex or topic-specific words may have errors."}},{"name":"Punctuation","descriptions":{"high":"Full control of sentence punctuation (commas, periods) and correct use of complex marks like colons or dashes for emphasis.","satisfactory":"Sentence punctuation (commas, periods) and basic use of complex marks like colons or dashes."}}]}'::jsonb
);

-- Sub-style rows (used for upload validation + key focus context)
INSERT INTO writing_marking_criteria (main_topic, sub_topic, key_focus, marking_criteria) VALUES
('Narrative', 'Imaginative / Adventure', 'Risk-taking and world-building.', '{"criteria":[]}'::jsonb),
('Narrative', 'Reflective', 'Emotional connection to the past.', '{"criteria":[]}'::jsonb),
('Narrative', 'Imaginative', 'Mystery and reaction to the unknown.', '{"criteria":[]}'::jsonb),
('Narrative', 'Dystopian / Diary', 'Daily life and belief systems in the future.', '{"criteria":[]}'::jsonb),
('Narrative', 'Speculative', 'Exploring conflict and environmental value.', '{"criteria":[]}'::jsonb),
('Narrative', 'Creative', 'Communicating through non-verbal details.', '{"criteria":[]}'::jsonb),
('Narrative', 'Anthropomorphic', 'Voice and perspective of a non-human.', '{"criteria":[]}'::jsonb),
('Narrative', 'Adventure', 'Pacing, tension, and "showing" vs. "telling".', '{"criteria":[]}'::jsonb),
('Narrative', 'Reflective / Adventure / Thriller', 'Urgency, pacing, and the "cliffhanger" ending.', '{"criteria":[]}'::jsonb),
('Persuasive', 'Argumentative / Speech', 'Arguing impact on different demographics.', '{"criteria":[]}'::jsonb),
('Persuasive', 'Argumentative', 'Fairness, logic, and strong examples.', '{"criteria":[]}'::jsonb),
('Persuasive', 'Editorial / Opinion', 'Use of a "call to action" and moral debate.', '{"criteria":[]}'::jsonb),
('Persuasive', 'Editorial', 'Rhetorical questions and long-term benefits.', '{"criteria":[]}'::jsonb),
('Informative', 'Expository / Report', 'Headlines and "expert" quotes for credibility.', '{"criteria":[]}'::jsonb),
('Informative', 'Proposal', 'Outlining a vision for curriculum and design.', '{"criteria":[]}'::jsonb);
