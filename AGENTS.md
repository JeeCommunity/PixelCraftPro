# PIXELCRAFT PRO — NON-NEGOTIABLE DEVELOPMENT RULES

## 1. NEVER SILENTLY CHANGE TECHNOLOGY

- Never replace an approved library, model, codec, engine, API, or processing pipeline.
- Never install a new package without explicit user approval.
- Never silently substitute another technology.
- Never add a fallback without explicit approval.
- If the requested technology cannot perform a task, STOP and report the exact limitation.
- Do not solve failures by secretly changing architecture.

## 2. PRESERVE WORKING FEATURES

- Never modify unrelated working features.
- Never redesign existing UI unless explicitly requested.
- Never change processing quality, algorithms, routes, or engines while fixing another feature.
- Before making changes, inspect the actual source code and existing implementation.

## 3. NO UNAPPROVED FALLBACKS

Do NOT introduce any alternative processing engine, including:

- Canvas conversion fallback
- Browser-native conversion fallback
- Sharp
- ImageMagick
- Cloudinary
- External conversion APIs
- Server-side conversion
- Alternative WASM engines
- Alternative codec libraries
- Any other replacement technology

unless the user explicitly approves it.

If the approved engine fails:

STOP → diagnose → report → wait for user approval.

Do NOT silently add a workaround.

## 4. IMAGE FORMAT CONVERTER

The Image Format Converter is restricted to the currently approved
jSquash codec packages:

- @jsquash/jpeg
- @jsquash/oxipng
- @jsquash/webp
- @jsquash/avif

Do not replace these packages.

Do not add Canvas conversion as a fallback.

Do not add another image conversion engine.

If a required conversion cannot be performed with the approved packages:

STOP.

Report the exact technical limitation.

Do not implement a workaround without approval.

## 5. USER-FACING TECHNOLOGY PRIVACY

Internal implementation details must NOT be displayed in the normal
production user interface.

Never expose internal:

- model names
- package names
- library names
- codec names
- WASM implementation names
- engine names
- internal API names
- dependency names

in:

- Main UI
- Tool cards
- Upload screens
- Processing screens
- Result screens
- Buttons
- Toasts
- Modals
- User-facing status messages
- User-facing errors
- SEO page copy
- Marketing copy
- FAQ content intended for normal users

Examples:

Internal:
jSquash

User-facing:
Advanced Image Processing

Internal:
@jsquash/avif

User-facing:
AVIF Processing

Internal:
BiRefNet

User-facing:
AI Background Removal

Internal:
GemaPDF

User-facing:
Smart PDF Compression

Internal:
pdfjs-dist

User-facing:
PDF Processing

Internal:
Pica

User-facing:
High-Quality Image Resizing

Internal:
ONNX Runtime

User-facing:
Local AI Processing

## 6. MODEL PRIVACY

Any model used internally by the application must be treated as an
implementation detail.

Never display the actual model name in normal production UI.

Do not expose model names through:

- Processing labels
- Feature descriptions
- Tool cards
- Result screens
- SEO text
- Marketing text
- User-facing errors

Capability-based descriptions must be used instead.

## 7. ERROR PRIVACY

Never expose raw technical exceptions directly to normal users.

Bad:
"@jsquash/avif encode failed"

Bad:
"WASM RuntimeError"

Bad:
"pdfjs-dist worker error"

Good:
"Unable to process this file."

Good:
"Conversion failed. Please try again."

Technical details may remain available in developer diagnostics,
logs, or internal reports.

## 8. INTERNAL VS USER-FACING INFORMATION

Technical names MAY remain in:

- Source code
- package.json
- lock files
- Developer comments
- Internal diagnostics
- Development console logs
- Test reports
- Internal audit reports

But they must not appear in normal production UI.

## 9. NO FALSE CLAIMS

Never hide technical information by replacing it with false claims.

Do not claim:

- unlimited
- instant
- lossless
- 100% private
- AI-powered
- completely local

unless the actual implementation supports that claim.

Use accurate capability descriptions.

## 10. SEO PRIVACY

SEO pages must describe the user benefit and tool capability.

Good:
"Compress images to 20KB directly in your browser."

Bad:
"Compress images using @jsquash/jpeg WASM."

Internal implementation names must not be used as public SEO
marketing content.

## 11. TESTING

Never claim PASS without actually testing.

For every implementation:

1. Inspect the actual source code.
2. Verify actual imports.
3. Verify package versions.
4. Verify actual runtime usage.
5. Test the requested feature.
6. Test representative edge cases.
7. Test production build.
8. Check that no forbidden fallback was added.
9. Check that technical names are not exposed in production UI.
10. Report actual results only.

Never invent test results.

## 12. CHANGE CONTROL

Before changing:

- architecture
- processing engine
- model
- codec
- package
- API
- backend
- processing pipeline

STOP and request explicit approval.

## 13. IMPLEMENTATION REPORT

After implementation, report:

- Exact files changed
- Packages added/removed
- Exact versions
- Actual engine used
- Actual internal model used, if relevant
- Tests actually performed
- Test results
- Production build result
- Known limitations
- Confirmation that no unapproved fallback was added
- Confirmation that internal technical names are not exposed in
  normal production UI

## 14. MOST IMPORTANT RULE

If any requested implementation conflicts with these rules:

STOP.

Do not silently choose another solution.

Report the conflict and wait for explicit user approval.

END OF RULES.
