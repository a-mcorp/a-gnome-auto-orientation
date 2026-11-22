# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!--
Template
## [{project-version}] - {YYYY-MM-DD}

### Added
### Changed
### Deprecated
### Removed
### Fixed
### Security
-->

## [1.0.0] - 2026-11-22

### Added
- Auto Orientation extension (`auto-orientation@a-mcorp.github.io`) for GNOME Shell 50 and 51.
  - Automatic rotation of the built-in screen in all four orientations, from the accelerometer of `iio-sensor-proxy`, after a stable reading of 1 second.
  - Manual orientations (Landscape, Portrait Right, Landscape (Flipped), Portrait Left), named and mapped as in GNOME Settings.
  - Rotation through `org.gnome.Mutter.DisplayConfig` with the temporary method, so the rotation is not saved into `monitors.xml`.
  - Top bar icon with an orientation menu and a link to the preferences; the icon shows whether rotation is automatic or locked.
  - Preferences window with an orientation selector, bound to the `orientation` GSettings key.
  - Auto correction (`sensor-offset` key) for accelerometers mounted at an angle, set automatically on first use (`sensor-calibrated` key) or with "Set Current Position as Default" in the top bar menu or in the preferences, which also explain it.
  - The original orientation is restored when the extension is disabled, and the accelerometer is only claimed in Auto mode, on a separate system bus connection.
- Testing steps for a virtual machine and for the laptop in `Extension/README.md`, and a testing log in `Extension/TESTING.md`.
- `NOTICE` with the copyright and additional section 7 terms (attribution, name) to GPL-3.0-or-later, referenced in `README.md`; `Extension/README.md` names the extension's own licence.
- `README.md` with Features above the two screenshots in one table, Dependencies next to Usage, and the screenshots in `docs/`.
- File headers with the file's name, its source repository under 'a-mcorp', its licence as an SPDX identifier and the year; links to the repositories point to the 'a-mcorp' organisation on GitHub.
- Created from 'A-GNOME-Extension-Template' (AGET) 1.0.1, which keeps the history of the build, the local CI and CD, the documentation and the GitHub templates.
