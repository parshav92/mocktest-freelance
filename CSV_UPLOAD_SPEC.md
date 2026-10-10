# CSV Upload Specification (Templates + Parsing + Validation)

This document defines the current exact behavior for CSV question/passage uploads.

## Source of truth

When changing upload behavior, update this file alongside:

- `lib/csv/templates.ts` (template columns + sample rows)
- `lib/csv/parser.ts` (CSV parsing + row validation + image requirement generation)
- `app/api/admin/questions/upload/route.ts` (DB transformation + insertion)
- `app/dashboard/upload/page.tsx` (admin preview rendering)

Ready-to-fill example files (one row per type) live in `public/templates/`.

---

## 1) Global CSV parsing behavior

Implemented in `lib/csv/parser.ts`.

- Header row is required.
- At least 1 data row is required.
- CSV parser supports quoted cells and escaped quotes (`""`).
- Cell values are trimmed.
- Empty rows are ignored.
- Header names are normalized to lowercase+trim before matching.
- Unknown extra CSV columns are ignored by parser mapping (only template columns are used).

---

## 2) Global validation rules

### 2.1 Required common fields for question types

For all question types (`mcq`, `passage_mcq`, `poem_mcq`, `fill_blank`, `fill_missing_sentence`, `essay`):

- `subject` column is mandatory.

### 2.2 Optional categorization fields

For all question types (`mcq`, `passage_mcq`, `poem_mcq`, `fill_blank`, `fill_missing_sentence`):

- `topic` is optional.
- `subtopic` is optional.
- If blank, both are stored as `null` in DB.

For `essay`, `topic` and `subtopic` are required (see 3.6).

### 2.3 Code behavior

- For question types, `code` column is optional.
- If `code` is missing/empty, code is auto-generated at upload time.
- For `passage` type, `code` is mandatory.
- The same code cannot appear on two rows of one CSV.

### 2.4 Difficulty values

Where difficulty is used, accepted values are:

- `easy`
- `medium`
- `hard`

Values are case-insensitive in CSV input.

### 2.5 Image count fields (strict numeric)

For MCQ-family types:

- `question_images` and `solution_images` columns are optional; an empty cell or missing column means `0`.
- When filled, they must be a numeric integer in range `0..10`.
- Non-numeric values are invalid.
- Deprecated singular columns `question_image` and `solution_image` are rejected.

Option image flags remain yes/no style:

- `option_a_image`, `option_b_image`, `option_c_image`, `option_d_image`
- Only `yes` triggers image requirement.

---

## 3) Exact templates by type

### 3.1 `mcq`

#### 3.1.1 Header

```csv
code,subject,difficulty,topic,subtopic,question,option_a,option_b,option_c,option_d,answer,solution,question_images,option_a_image,option_b_image,option_c_image,option_d_image,solution_images
```

#### 3.1.2 Required columns (validation)

- `subject`
- `difficulty`
- `question`
- `option_a`
- `option_b`
- `option_c`
- `option_d`
- `answer`

#### 3.1.3 Row-level rules

- `question` text is required.
- Each option needs text, unless its `option_X_image` is `yes` (image-only option).
- `answer` must be one of `A|B|C|D` (case-insensitive).
- `difficulty` must be `easy|medium|hard`.
- `question_images` and `solution_images` must be empty or numeric `0..10`.

---

### 3.2 `passage_mcq`

#### 3.2.1 Header

```csv
code,subject,passage_code,difficulty,topic,subtopic,question,option_a,option_b,option_c,option_d,answer,solution,question_images,option_a_image,option_b_image,option_c_image,option_d_image,solution_images
```

#### 3.2.2 Required columns (validation)

- Same as `mcq`, plus `passage_code`.

#### 3.2.3 Row-level rules

- Same as `mcq`.
- `passage_code` is required and can be comma-separated (for example `RD_P_001,RD_P_002`).
- The upload API revalidates this field before uploading images or inserting questions. A blank code rejects the entire upload with row-level errors.

---

### 3.3 `poem_mcq`

#### 3.3.1 Header

```csv
code,subject,passage_code,difficulty,topic,subtopic,question,option_a,option_b,option_c,option_d,answer,solution,question_images,option_a_image,option_b_image,option_c_image,option_d_image,solution_images
```

#### 3.3.2 Required columns (validation)

- Same as `passage_mcq`.

#### 3.3.3 Row-level rules

- Same as `passage_mcq`.

---

### 3.4 `fill_blank`

#### 3.4.1 Header

```csv
code,subject,difficulty,topic,subtopic,passage_text,blank_1_options,blank_2_options,blank_3_options,blank_4_options,blank_5_options,solution
```

#### 3.4.2 Required columns (validation)

- `subject`
- `difficulty`
- `passage_text`
- `blank_1_options`

#### 3.4.3 Row-level rules

- `difficulty` must be `easy|medium|hard`.
- `passage_text` must contain blank markers `[1]`, `[2]`, … `[N]` appearing in that order with no repeats or skipped numbers. The test player fills dropdowns by position.
- `passage_text` must not contain `___` or `{blank}` (the test player would treat them as extra blanks).
- Each `blank_N_options` for `N = 1..N` must have at least 2 pipe-separated options, with no empty or duplicate (case-insensitive) options.
- A filled `blank_N_options` cell beyond the number of markers is an error.
- There is no limit on the number of blanks. Add `blank_6_options`, `blank_7_options`, … columns as needed; the template header shows only the first five.
- The first option is the correct one. Options are shuffled in the test player.
- `solution` is optional and shown on the review page.
- There is no answer column and no passage link; the passage text is part of the question.

---

### 3.5 `fill_missing_sentence`

#### 3.5.1 Header

```csv
code,subject,difficulty,topic,subtopic,passage_with_gaps,sentences,solution
```

#### 3.5.2 Required columns (validation)

- `subject`
- `difficulty`
- `passage_with_gaps`
- `sentences`

#### 3.5.3 Row-level rules

- `difficulty` must be `easy|medium|hard`.
- `passage_with_gaps` must contain gap markers `{GAP_1}`, `{GAP_2}`, … `{GAP_N}` appearing in that order with no repeats or skipped numbers.
- `sentences` is a pipe-separated list of unique sentences. Sentence 1 fills `{GAP_1}`, sentence 2 fills `{GAP_2}`, and so on; any extra sentences are distractors. Sentences are shuffled in the test player.
- Number of sentences must be at least the number of gaps.
- `solution` is optional and shown on the review page.

---

### 3.6 `essay`

#### 3.6.1 Header

```csv
code,subject,difficulty,topic,subtopic,prompt,word_limit,time_mins
```

#### 3.6.2 Required columns (validation)

- `subject`
- `difficulty`
- `topic`
- `subtopic`
- `prompt`
- `word_limit`

#### 3.6.3 Row-level rules

- `difficulty` must be `easy|medium|hard`.
- `topic` (Narrative, Persuasive, Informative) and `subtopic` must match an entry in `writing_marking_criteria`; this is checked at upload.
- `word_limit` must be a whole number greater than 0. It is enforced in the editor and on submit.
- `time_mins` is optional. When filled it must be a whole number greater than 0. It is only displayed to the student; the test timer comes from the subject/test duration.

---

### 3.7 `passage`

#### 3.7.1 Header

```csv
code,type,title,content,has_image
```

#### 3.7.2 Required columns (validation)

- `code`
- `type`
- `content`

#### 3.7.3 Row-level rules

- `code` must start with the subject's code prefix followed by `_` (for example `RD_P_001`). Upload resolves the passage's subject from this prefix.
- `type` must be `extract` or `poem`.
- `has_image` uses yes/no style (`yes` means 1 passage image required).

---

## 4) Upload transformation rules

Implemented in `app/api/admin/questions/upload/route.ts`.

- `fill_blank` content is saved as:
  - `passage_text`
  - `blanks[]` where each blank has `position`, `options`, `correct_index` (always `0`), `correct`
  - `correct_answer` is `{ answers: number[], blanks: [...] }`
- `fill_missing_sentence` content is saved as:
  - `passage_with_gaps`
  - `sentences[]`
  - `correct_mapping` generated by gap order
- MCQ-family content is saved as:
  - `question`
  - `question_images[]` (if uploaded)
  - `options[]` with optional `image_url`
- `essay` content is saved as `prompt`, `word_limit`, and `time_mins` (only when provided).
- `solution` is saved to `solution_text` for every type that has the column.
- `solution_images[]` are mapped from `solution_images` count and uploaded files.

---

## 5) Admin preview rendering

Implemented in `app/dashboard/upload/page.tsx`.

- Question stem preview uses `ImageEnhancedText`, which includes:
  - KaTeX/math rendering through `MathText`
  - `[img:N]` inline/block image placement behavior
- Preview uses uploaded image previews for image placeholders.
- Fill-blank and fill-missing-sentence previews show structured fields for verification.

---

## 6) Change management rule (required)

Whenever any of the following changes, update this file in the same PR:

- CSV columns or sample templates
- Parser required fields or validation rules
- Image counting rules
- Upload content mapping to DB payload
- Admin preview rendering behavior

If this file and implementation diverge, implementation is runtime behavior and this file must be corrected immediately.
