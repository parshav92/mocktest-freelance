# Using Images in Question Text - [img:N] Syntax Guide

## Overview
Images can now be **inserted inline within question text** using the `[img:N]` syntax, where `N` is the image number shown in the uploader.

This allows you to:
- Place images after specific words or sentences
- Control image size and positioning automatically
- Use the same images in question text with the `[img:1]`, `[img:2]` pattern

## How It Works

### Step 1: Upload Your Images
When you upload a question:
1. Upload images for your question (question image, option images, solution images)
2. **Each image gets a number** shown in a badge: `[img:1]`, `[img:2]`, etc.
3. Note down these numbers in order

### Step 2: Use [img:N] in Question Text
In your CSV question field, use `[img:N]` to reference images:

**Example:**
```
Here is a square shape: [img:1] Find the area. The diagram also shows: [img:2]
```

If your uploaded images are:
- Image 1: diagram.png (marked as `[img:1]`)
- Image 2: formula.png (marked as `[img:2]`)

Then `[img:1]` will display diagram.png and `[img:2]` will display formula.png.

## Image Sizing (Automatic)

The system automatically decides image size based on position:

- **Mid-sentence images** `[img:1]` inside text → Small inline image (200px max) that flows with text
- **Full-width images** at start of line or standalone → Larger block image (100% width, 400px max height)

**Examples:**

**Inline (mid-sentence):**
```
Find the value of θ in this diagram: [img:1] where cos(θ) = 0.5
```
→ Image appears inline, small, next to text

**Block (full-width):**
```
Consider the following shape:
[img:1]
What is the total area?
```
→ Image appears on its own line, full width

## Important Notes

✓ **Serial numbering** = Images are numbered 1, 2, 3, ... in the order you upload them  
✓ **No stretching** = Images maintain aspect ratio, never distorted  
✓ **Responsive** = Layout adapts to different screen sizes  
✓ **Easy to modify** = Just edit question text in CSV, renumber images if needed  

## CSV Example

**MCQ with inline images:**

| code | subject | difficulty | question | option_a | option_b | option_c | option_d | answer | question_image | solution_images |
|------|---------|------------|----------|----------|----------|----------|----------|--------|---|---|
| MATH_01 | mathematics | medium | What is the area of this shape: [img:1] where width=10, height=5? | 50 | 60 | 75 | 100 | A | yes | 0 |

- Question will have 1 image uploaded (question_image = yes)
- Use `[img:1]` in the question text to reference it
- The image will appear inline where you place the `[img:1]` tag

## Frequently Asked Questions

**Q: Can I use multiple times? e.g., `[img:1]` twice?**  
A: Yes! You can reference the same image multiple times: "This is shape [img:1]. Now rotate [img:1]."

**Q: What if I reference `[img:3]` but only uploaded 2 images?**  
A: It will show a placeholder: "Fig. 3" telling the question maker an image is missing.

**Q: Can I mix [img:1] with regular images?**  
A: For question images: Use either the `[img:N]` syntax OR the traditional question_image field, not both.  
For option images: Keep using the separate option_image fields.

**Q: How do I know which image is which number?**  
A: During upload preview, each image shows its badge: `[img:1]`, `[img:2]`, etc. This is the number to use.

---

**Questions?** The image upload preview in the admin panel shows the exact numbering for each question.
