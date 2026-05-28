# Widget Host QA Matrix (Final Manual Pass)

Date: 2026-04-19

Goal: зафиксировать финальный ручной QA на 3-5 реальных хост-сайтах перед production rollout.

## Host Matrix (minimum)

1. Marketing landing (light/warm theme)
2. Product dashboard (neutral light theme)
3. Dark themed portal
4. CSP-restricted host (`frame-src` controlled)
5. Mobile Safari page (iOS)

## Test Cases Per Host

1. Widget load + open/close
2. Drag in collapsed mode
3. Drag in expanded mode
4. State machine transitions: `idle -> listening -> thinking -> speaking -> idle`
5. Error recovery: network degraded/offline
6. Voice edge-cases:
   - mic denied
   - autoplay blocked
   - TTS unavailable fallback
7. CTA visibility + readability (non-aggressive, always discoverable)
8. Contrast and typography against host background
9. Install health diagnostics (`window.ManyashaWidget.get(...).getInstallHealth()`)

## Evidence Template

For each host page attach:

- URL / environment
- Browser and version
- Screenshot/video
- Pass/Fail by each test case
- Notes (if fail) + issue link

## Quick Local Harness

For controlled host-like checks use:

- `frontend/public/embed-host-qa.html?theme=neutral`
- `frontend/public/embed-host-qa.html?theme=warm`
- `frontend/public/embed-host-qa.html?theme=dark`
- `frontend/public/embed-host-qa.html?theme=contrast`

This harness is not a replacement for real host QA, but reduces regression risk before final pass.
