# CSV Upload Specification (Templates + Parsing + Validation)

This document defines the current exact behavior for CSV question/passage uploads.

## Source of truth

When changing upload behavior, update this file alongside:

- `lib/csv/templates.ts` (template columns + sample rows)
- `lib/csv/parser.ts` (CSV parsing + row validation + image requirement generation)
- `app/api/admin/questions/upload/route.ts` (DB transformation + insertion)
- `app/dashboard/upload/page.tsx` (admin preview rendering)

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

For all question types (`mcq`, `passage_mcq`, `poem_mcq`, `fill_blank`, `fill_missing_sentence`, `essay`):

- `topic` is optional.
- `subtopic` is optional.
- If blank, both are stored as `null` in DB.

### 2.3 Code behavior

- For question types, `code` column is optional.
- If `code` is missing/empty, code is auto-generated at upload time.
- For `passage` type, `code` is mandatory.

### 2.4 Difficulty values

Where difficulty is used, accepted values are:

- `easy`
- `medium`
- `hard`

Values are case-insensitive in CSV input.

### 2.5 Image count fields (strict numeric)

For MCQ-family types:

- `question_images` must be numeric integer in range `0..10`.
- `solution_images` must be numeric integer in range `0..10`.
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
- `question_images`
- `solution_images`

#### 3.1.3 Row-level rules

- `answer` must be one of `A|B|C|D` (case-insensitive).
- `difficulty` must be `easy|medium|hard`.
- `question_images` and `solution_images` must be numeric `0..10`.

---

### 3.2 `passage_mcq`

#### 3.2.1 Header

```csv
code,subject,passage_code,difficulty,topic,subtopic,question,option_a,option_b,option_c,option_d,answer,solution,question_images,option_a_image,option_b_image,option_c_image,option_d_image,solution_images
```

#### 3.2.2 Required columns (validation)

- `subject`
- `passage_code`
- `difficulty`
- `question`
- `option_a`
- `option_b`
- `option_c`
- `option_d`
- `answer`
- `question_images`
- `solution_images`

#### 3.2.3 Row-level rules

- Same as `mcq` for answer/difficulty/image counts.
- `passage_code` is required and can be comma-separated (for example `RD_P_001,RD_P_002`).

---

### 3.3 `poem_mcq`

#### 3.3.1 Header

```csv
code,subject,passage_code,difficulty,topic,subtopic,question,option_a,option_b,option_c,option_d,answer,solution,question_images,option_a_image,option_b_image,option_c_image,option_d_image,solution_images
```

#### 3.3.2 Required columns (validation)

- `subject`
- `passage_code`
- `difficulty`
- `question`
- `option_a`
- `option_b`
- `option_c`
- `option_d`
- `answer`
- `question_images`
- `solution_images`

#### 3.3.3 Row-level rules

- Same as `passage_mcq`.

---

### 3.4 `fill_blank`

#### 3.4.1 Header

```csv
code,subject,passage_code,difficulty,topic,subtopic,passage_text,blank_1_options,blank_2_options,blank_3_options,blank_4_options,blank_5_options
```

#### 3.4.2 Required columns (validation)

- `subject`
- `difficulty`
- `passage_text`
- `blank_1_options`

#### 3.4.3 Row-level rules

- `difficulty` must be `easy|medium|hard`.
- `passage_text` must contain at least one blank marker like `[1]`.
- For each marker found (`[1]...[N]`), corresponding `blank_N_options` must be present.
- Options are pipe-separated; first option is treated as correct during upload transformation.

---

### 3.5 `fill_missing_sentence`

#### 3.5.1 Header

```csv
code,subject,difficulty,topic,subtopic,passage_with_gaps,sentences
```

#### 3.5.2 Required columns (validation)

- `subject`
- `difficulty`
- `passage_with_gaps`
- `sentences`

#### 3.5.3 Row-level rules

- `difficulty` must be `easy|medium|hard`.
- `passage_with_gaps` must include at least one marker like `{GAP_1}`.
- `sentences` is pipe-separated list.
- Number of provided sentences must be at least number of gap markers.

---

### 3.6 `essay`

#### 3.6.1 Header

```csv
code,subject,difficulty,topic,subtopic,prompt,word_limit,time_mins,rubric
```

#### 3.6.2 Required columns (validation)

- `subject`
- `difficulty`
- `prompt`
- `word_limit`
- `time_mins`

#### 3.6.3 Row-level rules

- `difficulty` must be `easy|medium|hard`.
- `word_limit` must be numeric.
- `time_mins` must be numeric.
- `rubric` is optional; format is `category:points|category:points`.

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

- `type` must be one of `extract|poem|article`.
- `has_image` uses yes/no style (`yes` means 1 passage image required).

---

## 4) Upload transformation rules

Implemented in `app/api/admin/questions/upload/route.ts`.

- `fill_blank` content is saved as:
  - `passage_text`
  - `blanks[]` where each blank has `position`, `options`, `correct_index`, `correct`
- `fill_missing_sentence` content is saved as:
  - `passage_with_gaps`
  - `sentences[]`
  - `correct_mapping` generated by gap order
- MCQ-family content is saved as:
  - `question`
  - `question_images[]` (if uploaded)
  - `options[]` with optional `image_url`
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
