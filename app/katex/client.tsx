"use client";

import { useState } from "react";
import { MathText } from "@/components/ui/math-text";
import { FORMULA_GROUPS } from "@/dev/katex-formulas";

export default function KatexClient() {
  const [input, setInput] = useState("\\frac{1}{1+\\frac{1}{2^{12}}}");
  const [activeGroup, setActiveGroup] = useState(FORMULA_GROUPS[0].group);

  const currentGroup =
    FORMULA_GROUPS.find((g) => g.group === activeGroup) ?? FORMULA_GROUPS[0];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8f9fa",
        fontFamily: "system-ui, -apple-system, sans-serif",
        display: "grid",
        gridTemplateRows: "auto 1fr",
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: "1px solid #dee2e6",
          background: "#fff",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 16, color: "#111" }}>
          KaTeX Tester
        </span>
        <span
          style={{
            background: "#e9ecef",
            padding: "2px 8px",
            borderRadius: 4,
            fontSize: 11,
            color: "#666",
            fontFamily: "monospace",
          }}
        >
          via MathText
        </span>
        <span
          style={{
            marginLeft: "auto",
            background: "#fff3bf",
            color: "#866800",
            padding: "2px 8px",
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          Admin only
        </span>
      </div>

      {/* Body: 3 columns */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "180px 1fr 1fr",
          overflow: "hidden",
          height: "calc(100vh - 45px)",
        }}
      >
        {/* LEFT SIDEBAR — group list */}
        <div
          style={{
            borderRight: "1px solid #dee2e6",
            overflowY: "auto",
            background: "#fff",
            padding: "8px 0",
          }}
        >
          {FORMULA_GROUPS.map((g) => (
            <button
              key={g.group}
              onClick={() => setActiveGroup(g.group)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "7px 14px",
                fontSize: 12,
                border: "none",
                background: activeGroup === g.group ? "#e7f5ff" : "transparent",
                color: activeGroup === g.group ? "#1971c2" : "#444",
                fontWeight: activeGroup === g.group ? 600 : 400,
                cursor: "pointer",
                borderLeft:
                  activeGroup === g.group
                    ? "3px solid #1971c2"
                    : "3px solid transparent",
              }}
            >
              {g.group}
            </button>
          ))}
        </div>

        {/* MIDDLE — formula picker + textarea */}
        <div
          style={{
            borderRight: "1px solid #dee2e6",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Formula list for selected group */}
          <div
            style={{
              overflowY: "auto",
              flex: "0 0 auto",
              maxHeight: "42%",
              borderBottom: "1px solid #dee2e6",
              padding: "8px",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#888",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                padding: "4px 6px 8px",
              }}
            >
              {currentGroup.group}
            </div>
            {currentGroup.items.map((item) => (
              <button
                key={item.label}
                onClick={() => setInput(item.value)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "5px 8px",
                  fontSize: 12,
                  border: "none",
                  borderRadius: 4,
                  background:
                    input === item.value ? "#e7f5ff" : "transparent",
                  color: input === item.value ? "#1971c2" : "#333",
                  cursor: "pointer",
                  marginBottom: 1,
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Textarea */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              padding: 12,
              gap: 8,
            }}
          >
            <label
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#888",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Input
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              spellCheck={false}
              style={{
                flex: 1,
                padding: "10px 12px",
                fontSize: 13,
                fontFamily: "'Courier New', monospace",
                color: "#111",
                background: "#fff",
                border: "1px solid #dee2e6",
                borderRadius: 6,
                resize: "none",
                outline: "none",
                lineHeight: 1.6,
              }}
              placeholder="Type a formula…"
            />
            {/* Raw string */}
            <div
              style={{
                padding: "6px 10px",
                background: "#f1f3f5",
                borderRadius: 4,
                fontSize: 11,
                fontFamily: "'Courier New', monospace",
                color: "#666",
                wordBreak: "break-all",
                maxHeight: 60,
                overflow: "auto",
              }}
            >
              {input || <span style={{ color: "#aaa" }}>—</span>}
            </div>
          </div>
        </div>

        {/* RIGHT — rendered output */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: 12,
            gap: 8,
            overflow: "hidden",
          }}
        >
          <label
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#888",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Output
          </label>
          <div
            style={{
              flex: 1,
              padding: "14px 16px",
              background: "#fff",
              border: "1px solid #dee2e6",
              borderRadius: 6,
              fontSize: 18,
              lineHeight: 2,
              color: "#111",
              wordBreak: "break-word",
              overflowY: "auto",
            }}
          >
            {input.trim() ? (
              <MathText content={input} block />
            ) : (
              <span style={{ color: "#aaa", fontSize: 13 }}>
                Output will appear here…
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
