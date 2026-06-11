// ============================================================
// KaTeX Formula Test Data  (gitignored — local dev only)
// ============================================================
// Import this in /app/katex/page.tsx to populate the tester.

export interface FormulaGroup {
  group: string;
  items: { label: string; value: string }[];
}

export const FORMULA_GROUPS: FormulaGroup[] = [
  // ──────────────────────────────────────────
  // FRACTIONS
  // ──────────────────────────────────────────
  {
    group: "Fractions",
    items: [
      { label: "Simple", value: "\\frac{1}{2}" },
      { label: "Nested num", value: "\\frac{\\frac{1}{2}}{3}" },
      { label: "Nested denom", value: "\\frac{1}{1+\\frac{1}{2^{12}}}" },
      { label: "Deep nested", value: "\\frac{a}{b+\\frac{c}{d+\\frac{e}{f}}}" },
      { label: "Continued fraction", value: "a_0 + \\frac{1}{a_1 + \\frac{1}{a_2 + \\frac{1}{a_3}}}" },
      { label: "Display frac", value: "\\dfrac{n!}{k!(n-k)!}" },
      { label: "Text frac", value: "\\tfrac{1}{2}" },
      { label: "Auto: 3/4", value: "3/4 of the total" },
      { label: "Auto: K/L", value: "K/L ratio" },
      { label: "Auto: mixed", value: "2 3/4 cups" },
    ],
  },

  // ──────────────────────────────────────────
  // ROOTS
  // ──────────────────────────────────────────
  {
    group: "Roots",
    items: [
      { label: "Square root", value: "\\sqrt{x}" },
      { label: "Cube root", value: "\\sqrt[3]{x}" },
      { label: "nth root", value: "\\sqrt[n]{x^n + y^n}" },
      { label: "Nested root", value: "\\sqrt{1 + \\sqrt{1 + \\sqrt{x}}}" },
      { label: "Root fraction", value: "\\sqrt{\\frac{a^2 + b^2}{c}}" },
      { label: "Auto: sqrt(x)", value: "sqrt(x+1)" },
    ],
  },

  // ──────────────────────────────────────────
  // EXPONENTS & SUBSCRIPTS
  // ──────────────────────────────────────────
  {
    group: "Exponents & Subscripts",
    items: [
      { label: "Simple power", value: "x^{2}" },
      { label: "Pythagorean", value: "x^{2} + y^{2} = z^{2}" },
      { label: "e^x", value: "e^{x}" },
      { label: "Complex exp", value: "e^{i\\pi} + 1 = 0" },
      { label: "Double super", value: "a^{b^{c}}" },
      { label: "Subscript", value: "a_{n}" },
      { label: "Sub+super", value: "a_{i}^{2}" },
      { label: "Tensor", value: "T^{\\mu\\nu}_{\\alpha\\beta}" },
      { label: "Auto: x^2", value: "The area is x^2 cm^2" },
      { label: "Auto: unicode ²", value: "5² + 3²" },
    ],
  },

  // ──────────────────────────────────────────
  // GREEK LETTERS
  // ──────────────────────────────────────────
  {
    group: "Greek Letters",
    items: [
      { label: "Lowercase", value: "\\alpha, \\beta, \\gamma, \\delta, \\epsilon, \\zeta, \\eta, \\theta" },
      { label: "More lower", value: "\\iota, \\kappa, \\lambda, \\mu, \\nu, \\xi, \\pi, \\rho" },
      { label: "Even more", value: "\\sigma, \\tau, \\upsilon, \\phi, \\chi, \\psi, \\omega" },
      { label: "Uppercase", value: "\\Gamma, \\Delta, \\Theta, \\Lambda, \\Xi, \\Pi, \\Sigma, \\Phi, \\Psi, \\Omega" },
      { label: "Variants", value: "\\varepsilon, \\varphi, \\vartheta, \\varrho, \\varsigma" },
      { label: "In formula", value: "\\alpha + \\beta = \\gamma" },
      { label: "Unicode α", value: "α + β = γ (auto-convert)" },
    ],
  },

  // ──────────────────────────────────────────
  // SUMS, PRODUCTS, INTEGRALS
  // ──────────────────────────────────────────
  {
    group: "Big Operators",
    items: [
      { label: "Sum", value: "\\sum_{i=1}^{n} i" },
      { label: "Sum formula", value: "\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}" },
      { label: "Double sum", value: "\\sum_{i=0}^{m} \\sum_{j=0}^{n} a_{ij}" },
      { label: "Product", value: "\\prod_{i=1}^{n} x_i" },
      { label: "Integral", value: "\\int_{a}^{b} f(x)\\,dx" },
      { label: "Double integral", value: "\\iint_{D} f(x,y)\\,dx\\,dy" },
      { label: "Triple integral", value: "\\iiint_{V} f\\,dV" },
      { label: "Contour", value: "\\oint_{C} \\mathbf{F}\\cdot d\\mathbf{r}" },
      { label: "Indefinite", value: "\\int x^{2}\\,dx = \\frac{x^{3}}{3} + C" },
      { label: "Gaussian", value: "\\int_{-\\infty}^{\\infty} e^{-x^{2}}\\,dx = \\sqrt{\\pi}" },
    ],
  },

  // ──────────────────────────────────────────
  // LIMITS & CALCULUS
  // ──────────────────────────────────────────
  {
    group: "Limits & Calculus",
    items: [
      { label: "Limit", value: "\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1" },
      { label: "Limit inf", value: "\\lim_{n \\to \\infty} \\left(1 + \\frac{1}{n}\\right)^n = e" },
      { label: "Derivative", value: "\\frac{d}{dx} x^n = n x^{n-1}" },
      { label: "Partial", value: "\\frac{\\partial f}{\\partial x}" },
      { label: "Chain rule", value: "\\frac{dy}{dx} = \\frac{dy}{du} \\cdot \\frac{du}{dx}" },
      { label: "Gradient", value: "\\nabla f = \\frac{\\partial f}{\\partial x}\\hat{i} + \\frac{\\partial f}{\\partial y}\\hat{j}" },
      { label: "Laplacian", value: "\\nabla^{2} f = \\frac{\\partial^{2} f}{\\partial x^{2}} + \\frac{\\partial^{2} f}{\\partial y^{2}}" },
    ],
  },

  // ──────────────────────────────────────────
  // TRIG FUNCTIONS
  // ──────────────────────────────────────────
  {
    group: "Trigonometry",
    items: [
      { label: "Identity", value: "\\sin^{2}\\theta + \\cos^{2}\\theta = 1" },
      { label: "All trig", value: "\\sin x, \\cos x, \\tan x, \\cot x, \\sec x, \\csc x" },
      { label: "Inverse", value: "\\arcsin x, \\arccos x, \\arctan x" },
      { label: "Hyperbolic", value: "\\sinh x, \\cosh x, \\tanh x" },
      { label: "Double angle", value: "\\sin(2\\theta) = 2\\sin\\theta\\cos\\theta" },
      { label: "Law of cosines", value: "c^{2} = a^{2} + b^{2} - 2ab\\cos C" },
      { label: "Euler formula", value: "e^{i\\theta} = \\cos\\theta + i\\sin\\theta" },
    ],
  },

  // ──────────────────────────────────────────
  // LOGARITHMS & EXPONENTIALS
  // ──────────────────────────────────────────
  {
    group: "Logarithms",
    items: [
      { label: "Natural log", value: "\\ln(e^{x}) = x" },
      { label: "Log base", value: "\\log_{a} b = \\frac{\\ln b}{\\ln a}" },
      { label: "Log rules", value: "\\log(xy) = \\log x + \\log y" },
      { label: "Log power", value: "\\log x^{n} = n \\log x" },
      { label: "Entropy", value: "H = -\\sum_{i} p_i \\log_2 p_i" },
    ],
  },

  // ──────────────────────────────────────────
  // MATRICES & VECTORS
  // ──────────────────────────────────────────
  {
    group: "Matrices & Vectors",
    items: [
      { label: "2×2 matrix", value: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}" },
      { label: "3×3 matrix", value: "\\begin{pmatrix} 1 & 0 & 0 \\\\ 0 & 1 & 0 \\\\ 0 & 0 & 1 \\end{pmatrix}" },
      { label: "Determinant", value: "\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix} = ad - bc" },
      { label: "Augmented", value: "\\left[\\begin{array}{cc|c} 1 & 2 & 3 \\\\ 4 & 5 & 6 \\end{array}\\right]" },
      { label: "Column vector", value: "\\vec{v} = \\begin{pmatrix} x \\\\ y \\\\ z \\end{pmatrix}" },
      { label: "Dot product", value: "\\vec{a} \\cdot \\vec{b} = |\\vec{a}||\\vec{b}|\\cos\\theta" },
      { label: "Cross product", value: "\\vec{a} \\times \\vec{b} = \\begin{vmatrix} \\hat{i} & \\hat{j} & \\hat{k} \\\\ a_1 & a_2 & a_3 \\\\ b_1 & b_2 & b_3 \\end{vmatrix}" },
    ],
  },

  // ──────────────────────────────────────────
  // SET THEORY & LOGIC
  // ──────────────────────────────────────────
  {
    group: "Set Theory & Logic",
    items: [
      { label: "Membership", value: "x \\in A, \\quad y \\notin B" },
      { label: "Subset", value: "A \\subset B \\subset C" },
      { label: "Union/Inter", value: "A \\cup B, \\quad A \\cap B" },
      { label: "Set diff", value: "A \\setminus B" },
      { label: "Empty set", value: "A \\cap B = \\emptyset" },
      { label: "Power set", value: "|\\mathcal{P}(A)| = 2^{|A|}" },
      { label: "Quantifiers", value: "\\forall x \\in \\mathbb{R}, \\exists y: y > x" },
      { label: "Implication", value: "P \\Rightarrow Q, \\quad P \\Leftrightarrow Q" },
      { label: "Logic ops", value: "P \\land Q, \\quad P \\lor Q, \\quad \\lnot P" },
    ],
  },

  // ──────────────────────────────────────────
  // NUMBER SETS
  // ──────────────────────────────────────────
  {
    group: "Number Sets",
    items: [
      { label: "All sets", value: "\\mathbb{N} \\subset \\mathbb{Z} \\subset \\mathbb{Q} \\subset \\mathbb{R} \\subset \\mathbb{C}" },
      { label: "Complex", value: "z = a + bi, \\quad z \\in \\mathbb{C}" },
      { label: "Modular", value: "a \\equiv b \\pmod{n}" },
    ],
  },

  // ──────────────────────────────────────────
  // ALGEBRA
  // ──────────────────────────────────────────
  {
    group: "Algebra",
    items: [
      { label: "Quadratic formula", value: "x = \\frac{-b \\pm \\sqrt{b^{2} - 4ac}}{2a}" },
      { label: "Binomial theorem", value: "(x+y)^n = \\sum_{k=0}^{n} \\binom{n}{k} x^{n-k} y^k" },
      { label: "Binomial coeff", value: "\\binom{n}{k} = \\frac{n!}{k!(n-k)!}" },
      { label: "Geometric series", value: "\\sum_{k=0}^{\\infty} r^k = \\frac{1}{1-r}, \\quad |r| < 1" },
      { label: "AM-GM", value: "\\frac{a+b}{2} \\geq \\sqrt{ab}" },
      { label: "Cauchy-Schwarz", value: "\\left(\\sum_{i=1}^n a_i b_i\\right)^2 \\leq \\left(\\sum_{i=1}^n a_i^2\\right)\\left(\\sum_{i=1}^n b_i^2\\right)" },
    ],
  },

  // ──────────────────────────────────────────
  // STATISTICS & PROBABILITY
  // ──────────────────────────────────────────
  {
    group: "Statistics & Probability",
    items: [
      { label: "Mean", value: "\\bar{x} = \\frac{1}{n}\\sum_{i=1}^{n} x_i" },
      { label: "Variance", value: "\\sigma^{2} = \\frac{1}{n}\\sum_{i=1}^{n}(x_i - \\mu)^{2}" },
      { label: "Std dev", value: "\\sigma = \\sqrt{\\frac{\\sum(x_i-\\mu)^2}{n}}" },
      { label: "Bayes theorem", value: "P(A|B) = \\frac{P(B|A)\\,P(A)}{P(B)}" },
      { label: "Normal PDF", value: "f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}} e^{-\\frac{1}{2}\\left(\\frac{x-\\mu}{\\sigma}\\right)^2}" },
      { label: "Correlation", value: "r = \\frac{\\sum(x_i-\\bar{x})(y_i-\\bar{y})}{\\sqrt{\\sum(x_i-\\bar{x})^2 \\sum(y_i-\\bar{y})^2}}" },
      { label: "Poisson", value: "P(X=k) = \\frac{\\lambda^k e^{-\\lambda}}{k!}" },
      { label: "Binomial prob", value: "P(X=k) = \\binom{n}{k} p^k (1-p)^{n-k}" },
    ],
  },

  // ──────────────────────────────────────────
  // PHYSICS
  // ──────────────────────────────────────────
  {
    group: "Physics",
    items: [
      { label: "Einstein", value: "E = mc^{2}" },
      { label: "Kinetic energy", value: "KE = \\frac{1}{2}mv^{2}" },
      { label: "Newton 2nd", value: "F = ma" },
      { label: "Gravitation", value: "F = G\\frac{m_1 m_2}{r^{2}}" },
      { label: "Schrödinger", value: "i\\hbar\\frac{\\partial}{\\partial t}\\Psi = \\hat{H}\\Psi" },
      { label: "Maxwell 1", value: "\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\varepsilon_0}" },
      { label: "Maxwell 2", value: "\\nabla \\times \\mathbf{B} = \\mu_0\\mathbf{J} + \\mu_0\\varepsilon_0 \\frac{\\partial \\mathbf{E}}{\\partial t}" },
      { label: "Lorentz factor", value: "\\gamma = \\frac{1}{\\sqrt{1-\\frac{v^2}{c^2}}}" },
      { label: "Wave equation", value: "\\frac{\\partial^2 u}{\\partial t^2} = c^2 \\frac{\\partial^2 u}{\\partial x^2}" },
      { label: "Ohms law", value: "V = IR" },
    ],
  },

  // ──────────────────────────────────────────
  // DELIMITERS & BRACKETS
  // ──────────────────────────────────────────
  {
    group: "Delimiters",
    items: [
      { label: "Auto-size parens", value: "\\left( \\frac{a}{b} \\right)" },
      { label: "Auto-size brackets", value: "\\left[ \\frac{a}{b} \\right]" },
      { label: "Auto-size braces", value: "\\left\\{ x \\in \\mathbb{R} : x > 0 \\right\\}" },
      { label: "Absolute value", value: "\\left| x \\right|" },
      { label: "Norm", value: "\\left\\| \\vec{v} \\right\\|" },
      { label: "Floor/Ceil", value: "\\lfloor x \\rfloor, \\lceil x \\rceil" },
      { label: "Angle bracket", value: "\\langle \\phi | \\psi \\rangle" },
    ],
  },

  // ──────────────────────────────────────────
  // OPERATORS & ARROWS
  // ──────────────────────────────────────────
  {
    group: "Operators & Arrows",
    items: [
      { label: "Relations", value: "a \\leq b \\geq c \\neq d \\approx e" },
      { label: "Plus/minus", value: "x = \\pm\\sqrt{y}" },
      { label: "Arrows", value: "A \\rightarrow B \\leftarrow C" },
      { label: "Double arrows", value: "P \\Rightarrow Q \\Leftarrow R" },
      { label: "Long arrows", value: "A \\xrightarrow{f} B \\xleftarrow{g} C" },
      { label: "Infinity", value: "\\lim_{n\\to\\infty}" },
      { label: "Proportional", value: "y \\propto x^{2}" },
      { label: "Therefore/Because", value: "a = b \\therefore b = a" },
    ],
  },

  // ──────────────────────────────────────────
  // TEXT FONTS IN MATH
  // ──────────────────────────────────────────
  {
    group: "Math Fonts",
    items: [
      { label: "Bold", value: "\\mathbf{v} = (v_x, v_y, v_z)" },
      { label: "Italic", value: "\\mathit{slope} = \\frac{\\Delta y}{\\Delta x}" },
      { label: "Calligraphy", value: "\\mathcal{L}(\\theta)" },
      { label: "Blackboard bold", value: "\\mathbb{R}^n" },
      { label: "Fraktur", value: "\\mathfrak{g}" },
      { label: "Sans-serif", value: "\\mathsf{A}" },
      { label: "Typewriter", value: "\\mathtt{code}" },
      { label: "Roman", value: "\\mathrm{d}x" },
    ],
  },

  // ──────────────────────────────────────────
  // SPACING & ALIGNMENT
  // ──────────────────────────────────────────
  {
    group: "Spacing",
    items: [
      { label: "Thin space", value: "a\\,b" },
      { label: "Medium space", value: "a\\;b" },
      { label: "Quad", value: "a\\quad b" },
      { label: "Negative space", value: "a\\!b" },
      { label: "Phantom", value: "a + \\phantom{xxx} = b" },
    ],
  },

  // ──────────────────────────────────────────
  // CHEMISTRY-STYLE
  // ──────────────────────────────────────────
  {
    group: "Chemistry-style",
    items: [
      { label: "H2O", value: "\\text{H}_2\\text{O}" },
      { label: "CO2", value: "\\text{CO}_2" },
      { label: "Reaction", value: "\\text{CH}_4 + 2\\text{O}_2 \\rightarrow \\text{CO}_2 + 2\\text{H}_2\\text{O}" },
      { label: "Equilibrium", value: "K_{eq} = \\frac{[\\text{C}]^c[\\text{D}]^d}{[\\text{A}]^a[\\text{B}]^b}" },
    ],
  },

  // ──────────────────────────────────────────
  // EDGE CASES / UNICODE AUTO-DETECT
  // ──────────────────────────────────────────
  {
    group: "Unicode Auto-detect",
    items: [
      { label: "Half ½", value: "½ of 100 is 50" },
      { label: "Pi π", value: "The area is πr²" },
      { label: "Theta θ", value: "θ = 45°" },
      { label: "Times ×", value: "3 × 4 = 12" },
      { label: "Div ÷", value: "10 ÷ 2 = 5" },
      { label: "Plus-minus ±", value: "x = ±5" },
      { label: "Approx ≈", value: "π ≈ 3.14159" },
      { label: "Leq ≤", value: "x ≤ y ≥ z" },
      { label: "Infinity ∞", value: "∑ from 0 to ∞" },
      { label: "Sqrt ∫", value: "∫ from 0 to 1" },
    ],
  },

  // ──────────────────────────────────────────
  // MIXED TEXT + MATH
  // ──────────────────────────────────────────
  {
    group: "Mixed Text + Math",
    items: [
      { label: "Sentence 1", value: "If \\frac{a}{b} = \\frac{c}{d}, then ad = bc." },
      { label: "Sentence 2", value: "The roots of ax^{2} + bx + c = 0 are \\frac{-b \\pm \\sqrt{b^{2}-4ac}}{2a}." },
      { label: "Sentence 3", value: "Area of circle = \\pi r^{2}" },
      { label: "Sentence 4", value: "\\sin^{2}\\theta + \\cos^{2}\\theta = 1 for all \\theta \\in \\mathbb{R}." },
      { label: "Sentence 5", value: "Volume of sphere = \\frac{4}{3}\\pi r^{3}" },
      { label: "Sentence 6", value: "Probability: P(A \\cup B) = P(A) + P(B) - P(A \\cap B)" },
    ],
  },
];

// Flat list for easy lookup
export const ALL_FORMULAS = FORMULA_GROUPS.flatMap((g) =>
  g.items.map((item) => ({ ...item, group: g.group }))
);
